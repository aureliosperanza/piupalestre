const db = require('../config/db');
const bcrypt = require('bcryptjs');

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// POST /api/leads - Publicly create a lead
exports.createLead = async (req, res) => {
  try {
    const { name, gym_name, city, phone, email } = req.body;
    if (!name || !gym_name || !city || !phone || !email) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    const [result] = await db('leads').insert({
      name,
      gym_name,
      city,
      phone,
      email,
      status: 'new'
    }).returning('id');
    const id = result.id ? result.id : result;

    const newLead = await db('leads').where({ id }).first();
    res.status(201).json(newLead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/admin/leads - Get all leads
exports.getLeads = async (req, res) => {
  try {
    const leads = await db('leads').orderBy('created_at', 'desc');
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/admin/leads/:id - Update lead status
exports.updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'contacted', 'converted', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    const lead = await db('leads').where({ id }).first();
    if (!lead) {
      return res.status(404).json({ error: 'Lead non trovato' });
    }

    await db('leads').where({ id }).update({ status, updated_at: db.fn.now() });
    const updatedLead = await db('leads').where({ id }).first();
    res.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/admin/gyms - Get all gyms with client count
exports.getGyms = async (req, res) => {
  try {
    // Select all columns from gyms, count of clients, left join on gym_id
    const gyms = await db('gyms')
      .select('gyms.id', 'gyms.name', 'gyms.slug', 'gyms.email', 'gyms.status', 'gyms.is_admin', 'gyms.created_at')
      .count('clients.id as client_count')
      .leftJoin('clients', 'gyms.id', 'clients.gym_id')
      .groupBy('gyms.id')
      .orderBy('gyms.created_at', 'desc');

    res.json(gyms);
  } catch (error) {
    console.error('Error fetching gyms list:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/admin/gyms - Create a new gym manually
exports.createGym = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Tutti i campi (name, email, password) sono obbligatori' });
    }

    const existing = await db('gyms').where({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Questa email è già associata ad un account palestra' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const slug = slugify(name);

    // Verify unique slug
    const existingSlug = await db('gyms').where({ slug }).first();
    if (existingSlug) {
      return res.status(400).json({ error: 'Un nome palestra simile è già registrato, scegli un nome diverso' });
    }

    const [result] = await db('gyms').insert({
      name,
      email,
      password_hash: passwordHash,
      status: 'active',
      is_admin: false,
      slug
    }).returning('id');
    const id = result.id ? result.id : result;

    const newGym = await db('gyms').where({ id }).first();
    delete newGym.password_hash;
    res.status(201).json(newGym);
  } catch (error) {
    console.error('Error creating gym manually:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/admin/gyms/:id/status - Suspend or activate a gym
exports.updateGymStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Stato non valido' });
    }

    const gym = await db('gyms').where({ id }).first();
    if (!gym) {
      return res.status(404).json({ error: 'Palestra non trovata' });
    }

    if (gym.is_admin) {
      return res.status(400).json({ error: 'Non è possibile sospendere l\'account amministratore' });
    }

    await db('gyms').where({ id }).update({ status, updated_at: db.fn.now() });
    const updatedGym = await db('gyms').where({ id }).first();
    delete updatedGym.password_hash;
    res.json(updatedGym);
  } catch (error) {
    console.error('Error updating gym status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
