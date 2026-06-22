const db = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
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

// POST /api/checkins - Evaluate access based on medical certificate + active membership
exports.createCheckin = async (req, res) => {
  try {
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    // Client must belong to the authenticated gym
    const client = await db('clients').where({ id: client_id, gym_id: req.gym }).first();
    if (!client) {
      return res.status(404).json({ error: 'Cliente non trovato in questa palestra' });
    }

    let status = 'allowed';
    let reason = 'ok';
    let activeMembership = null;

    // 1. Medical certificate has top priority
    if (isExpired(client.medical_certificate_expiry)) {
      status = 'denied';
      reason = 'Certificato Medico Scaduto';
    } else {
      // 2. Look for an active membership (joined with its plan to know the type)
      const membership = await db('client_memberships')
        .join('plans', 'client_memberships.plan_id', 'plans.id')
        .where('client_memberships.client_id', client_id)
        .andWhere('client_memberships.status', 'active')
        .select('client_memberships.*', 'plans.type as plan_type', 'plans.name as plan_name')
        .orderBy('client_memberships.id', 'desc')
        .first();

      if (!membership) {
        status = 'denied';
        reason = 'Nessun abbonamento attivo';
      } else if (membership.plan_type === 'time') {
        // 3a. Time plan: blocked if today is past the end_date
        if (isExpired(membership.end_date)) {
          await db('client_memberships').where({ id: membership.id }).update({ status: 'expired' });
          status = 'denied';
          reason = 'Abbonamento Scaduto';
        } else {
          activeMembership = membership;
        }
      } else if (membership.plan_type === 'count') {
        // 3b. Count plan: blocked if no entries remain, otherwise decrement by 1
        if (membership.remaining_checkins <= 0) {
          await db('client_memberships').where({ id: membership.id }).update({ status: 'expired' });
          status = 'denied';
          reason = 'Ingressi Esauriti';
        } else {
          await db('client_memberships')
            .where({ id: membership.id })
            .update({ remaining_checkins: membership.remaining_checkins - 1 });
          activeMembership = { ...membership, remaining_checkins: membership.remaining_checkins - 1 };
        }
      }
    }

    // Persist the check-in attempt to the history log
    await db('checkins').insert({
      client_id,
      checkin_time: db.fn.now(),
      status,
      reason,
      gym_id: req.gym
    });

    res.status(201).json({
      status,
      reason,
      client: {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        medical_certificate_expiry: client.medical_certificate_expiry
      },
      membership: activeMembership
        ? {
            plan_name: activeMembership.plan_name,
            type: activeMembership.plan_type,
            end_date: activeMembership.end_date,
            remaining_checkins: activeMembership.remaining_checkins
          }
        : null
    });
  } catch (error) {
    console.error('Error creating checkin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/checkins - Retrieve the last 10 entries (scoped to current gym)
exports.getCheckins = async (req, res) => {
  try {
    const checkins = await db('checkins')
      .select('checkins.*', 'clients.first_name', 'clients.last_name')
      .join('clients', 'checkins.client_id', 'clients.id')
      .where('checkins.gym_id', req.gym)
      .orderBy('checkins.checkin_time', 'desc')
      .limit(10);

    res.json(checkins);
  } catch (error) {
    console.error('Error fetching checkins:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/checkins/scan - Verifica il QR token e processa il check-in
exports.scanCheckin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token mancante' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Return 400 with a clean message so the frontend can display it
      return res.status(400).json({ status: 'denied', reason: 'Codice QR scaduto o non valido' });
    }

    if (decoded.purpose !== 'checkin') {
      return res.status(400).json({ status: 'denied', reason: 'Token non valido per il check-in' });
    }

    if (decoded.gym_id !== req.gym) {
      return res.status(400).json({ status: 'denied', reason: 'Questo QR Code appartiene a un\'altra palestra' });
    }

    // Re-use the existing check-in logic
    req.body.client_id = decoded.client_id;
    return exports.createCheckin(req, res);
  } catch (error) {
    console.error('Error in scanCheckin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
