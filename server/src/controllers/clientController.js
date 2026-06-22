const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// Returns true if the given date is strictly in the past (before today)
const isExpired = (dateInput) => {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

// Derive the effective membership status from a joined membership row (or undefined)
const buildMembershipInfo = (m) => {
  if (!m) {
    return { active_membership: null, membership_status: 'none' };
  }
  let expired;
  if (m.plan_type === 'time') {
    expired = isExpired(m.end_date);
  } else {
    expired = m.remaining_checkins != null && m.remaining_checkins <= 0;
  }
  return {
    active_membership: {
      id: m.id,
      plan_id: m.plan_id,
      plan_name: m.plan_name,
      type: m.plan_type,
      is_promo: !!m.is_promo,
      start_date: m.start_date,
      end_date: m.end_date,
      remaining_checkins: m.remaining_checkins,
      status: expired ? 'expired' : 'active'
    },
    membership_status: expired ? 'expired' : 'active'
  };
};

// Fetch the latest active membership for each of the given client ids, keyed by client_id
const fetchActiveMemberships = async (clientIds) => {
  if (clientIds.length === 0) return {};
  const rows = await db('client_memberships')
    .join('plans', 'client_memberships.plan_id', 'plans.id')
    .whereIn('client_memberships.client_id', clientIds)
    .andWhere('client_memberships.status', 'active')
    .select('client_memberships.*', 'plans.name as plan_name', 'plans.type as plan_type', 'plans.is_promo as is_promo')
    .orderBy('client_memberships.id', 'desc');

  const byClient = {};
  for (const row of rows) {
    if (!byClient[row.client_id]) byClient[row.client_id] = row; // first = latest (desc)
  }
  return byClient;
};

// Fetch the latest approved certificate for each of the given client ids
const fetchLatestCertificates = async (clientIds) => {
  if (clientIds.length === 0) return {};
  const rows = await db('medical_certificates')
    .whereIn('client_id', clientIds)
    .andWhere('status', 'approved')
    .orderBy('id', 'desc');

  const byClient = {};
  for (const row of rows) {
    if (!byClient[row.client_id]) byClient[row.client_id] = row; // first = latest (desc)
  }
  return byClient;
};

// GET /api/clients - Get all clients with optional search & status filter (scoped to current gym)
exports.getClients = async (req, res) => {
  try {
    const { q, status } = req.query;

    let query = db('clients').select('*').where('gym_id', req.gym).orderBy('created_at', 'desc');

    if (q) {
      query = query.where(function() {
        this.where('first_name', 'like', `%${q}%`)
            .orWhere('last_name', 'like', `%${q}%`)
            .orWhere('email', 'like', `%${q}%`)
            .orWhere('phone', 'like', `%${q}%`);
      });
    }

    const clients = await query;

    // Enrich each client with their current active membership and latest certificate
    const byClient = await fetchActiveMemberships(clients.map(c => c.id));
    const certsByClient = await fetchLatestCertificates(clients.map(c => c.id));
    
    let enriched = clients.map(c => ({ 
      ...c, 
      ...buildMembershipInfo(byClient[c.id]),
      certificate_file_path: certsByClient[c.id] ? certsByClient[c.id].file_path : null
    }));

    // Status filter now applies to the computed membership status (active | expired)
    if (status) {
      enriched = enriched.filter(c => c.membership_status === status);
    }

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/clients/:id - Get a single client's details (restricted to current gym)
exports.getClientById = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await db('clients').where({ id, gym_id: req.gym }).first();

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const byClient = await fetchActiveMemberships([client.id]);
    const certsByClient = await fetchLatestCertificates([client.id]);
    
    res.json({ 
      ...client, 
      ...buildMembershipInfo(byClient[client.id]),
      certificate_file_path: certsByClient[client.id] ? certsByClient[client.id].file_path : null
    });
  } catch (error) {
    console.error('Error fetching client by id:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/clients - Create a new client (linked to current gym)
exports.createClient = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      gender,
      birth_place,
      province,
      tax_code,
      email,
      phone,
      birth_date,
      medical_certificate_expiry
    } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !phone) {
      return res.status(400).json({ error: 'first_name, last_name, email, and phone are required fields' });
    }

    // Check unique email within this gym
    const existing = await db('clients').where({ email, gym_id: req.gym }).first();
    if (existing) {
      return res.status(400).json({ error: 'Questa email è già registrata in questa palestra' });
    }

    const [id] = await db('clients').insert({
      first_name,
      last_name,
      gender: gender || 'M',
      birth_place: birth_place || null,
      province: province || null,
      tax_code: tax_code || null,
      email,
      phone,
      birth_date: birth_date || null,
      medical_certificate_expiry: medical_certificate_expiry || null,
      gym_id: req.gym
    });

    if (req.file) {
      await db('medical_certificates').insert({
        client_id: id,
        gym_id: req.gym,
        file_path: '/uploads/' + req.file.filename,
        status: 'approved'
      });
    }

    const newClient = await db('clients').where({ id, gym_id: req.gym }).first();
    res.status(201).json(newClient);
  } catch (error) {
    console.error('Error creating client:', error);
    if (error.message.includes('UNIQUE') || error.message.includes('unique') || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/clients/:id - Update an existing client (restricted to current gym)
exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      gender,
      birth_place,
      province,
      tax_code,
      email,
      phone,
      birth_date,
      medical_certificate_expiry
    } = req.body;

    const existing = await db('clients').where({ id, gym_id: req.gym }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const updatePayload = {
      first_name,
      last_name,
      gender: gender || 'M',
      birth_place: birth_place || null,
      province: province || null,
      tax_code: tax_code || null,
      email,
      phone,
      birth_date: birth_date || null,
      medical_certificate_expiry: medical_certificate_expiry || null,
      updated_at: db.fn.now()
    };

    // If a new certificate was uploaded, store it in medical_certificates
    if (req.file) {
      await db('medical_certificates').insert({
        client_id: id,
        gym_id: req.gym,
        file_path: '/uploads/' + req.file.filename,
        status: 'approved'
      });
    } else if (req.body.remove_certificate === 'true') {
      // User explicitly removed the existing certificate
      await db('medical_certificates')
        .where({ client_id: id, gym_id: req.gym, status: 'approved' })
        .update({ status: 'rejected', rejection_reason: 'Rimozione manuale da CRM' });
      
      updatePayload.medical_certificate_expiry = null;
    }

    await db('clients')
      .where({ id, gym_id: req.gym })
      .update(updatePayload);

    const updatedClient = await db('clients').where({ id, gym_id: req.gym }).first();
    res.json(updatedClient);
  } catch (error) {
    console.error('Error updating client:', error);
    if (error.message.includes('UNIQUE') || error.message.includes('unique') || error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /api/clients/:id - Delete a client (restricted to current gym)
exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db('clients').where({ id, gym_id: req.gym }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await db('clients').where({ id, gym_id: req.gym }).del();

    // Best-effort cleanup of the associated certificate file
    const certs = await db('medical_certificates').where({ client_id: id });
    for (const cert of certs) {
      if (cert.file_path) {
        const filename = cert.file_path.split('/').pop();
        const filePath = path.join(__dirname, '..', '..', 'uploads', filename);
        fs.unlink(filePath, () => {});
      }
    }
    
    // Also cleanup legacy column file if exists
    if (existing.certificate_file_name) {
      const filePath = path.join(__dirname, '..', '..', 'uploads', existing.certificate_file_name);
      fs.unlink(filePath, () => {});
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
