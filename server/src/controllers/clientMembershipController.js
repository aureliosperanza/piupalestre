const db = require('../config/db');

// Add N months to a date and return YYYY-MM-DD
const addMonths = (dateStr, months) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

// POST /api/client-memberships - Sell/assign a plan to a client.
// The server computes end_date (time plans) or remaining_checkins (count plans).
exports.createMembership = async (req, res) => {
  try {
    const { client_id, plan_id, start_date, assigned_price, paid_amount } = req.body;

    if (!client_id || !plan_id || !start_date) {
      return res.status(400).json({ error: 'client_id, plan_id e start_date sono obbligatori' });
    }

    // Both client and plan must belong to the authenticated gym
    const client = await db('clients').where({ id: client_id, gym_id: req.gym }).first();
    if (!client) {
      return res.status(404).json({ error: 'Cliente non trovato in questa palestra' });
    }
    const plan = await db('plans').where({ id: plan_id, gym_id: req.gym }).first();
    if (!plan) {
      return res.status(404).json({ error: 'Piano non trovato nel listino di questa palestra' });
    }

    let end_date = null;
    let remaining_checkins = null;
    if (plan.type === 'time') {
      end_date = addMonths(start_date, plan.duration_months);
    } else {
      remaining_checkins = plan.max_checkins;
    }

    const final_assigned_price = assigned_price !== undefined ? assigned_price : plan.price;
    const final_paid_amount = paid_amount !== undefined ? paid_amount : 0;
    
    let payment_status = 'partial';
    if (final_paid_amount >= final_assigned_price) {
      payment_status = 'paid';
    } else if (final_paid_amount === 0) {
      payment_status = 'unpaid';
    }

    // Renewal: supersede any previous active membership for this client
    await db('client_memberships')
      .where({ client_id, status: 'active' })
      .update({ status: 'cancelled' });

    const [id] = await db('client_memberships').insert({
      client_id,
      plan_id,
      start_date,
      end_date,
      remaining_checkins,
      status: 'active',
      assigned_price: final_assigned_price,
      paid_amount: final_paid_amount,
      payment_status
    });

    const membership = await db('client_memberships')
      .join('plans', 'client_memberships.plan_id', 'plans.id')
      .where('client_memberships.id', id)
      .select('client_memberships.*', 'plans.name as plan_name', 'plans.type as plan_type', 'plans.price')
      .first();

    res.status(201).json(membership);
  } catch (error) {
    console.error('Error creating membership:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/client-memberships?client_id=:id - History of contracts for a client
exports.getMemberships = async (req, res) => {
  try {
    const { client_id } = req.query;

    let query = db('client_memberships')
      .join('plans', 'client_memberships.plan_id', 'plans.id')
      .join('clients', 'client_memberships.client_id', 'clients.id')
      .where('clients.gym_id', req.gym)
      .select('client_memberships.*', 'plans.name as plan_name', 'plans.type as plan_type', 'plans.price')
      .orderBy('client_memberships.id', 'desc');

    if (client_id) {
      query = query.where('client_memberships.client_id', client_id);
    }

    const memberships = await query;
    res.json(memberships);
  } catch (error) {
    console.error('Error fetching memberships:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
