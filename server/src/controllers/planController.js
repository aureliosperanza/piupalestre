const db = require('../config/db');

// Validate & normalize plan fields shared by create/update
const buildPlanPayload = (body) => {
  const { name, type, duration_months, max_checkins, price, is_promo } = body;

  if (!name || !type || price === undefined || price === null) {
    return { error: 'name, type e price sono obbligatori' };
  }
  if (!['time', 'count'].includes(type)) {
    return { error: "type deve essere 'time' o 'count'" };
  }
  if (type === 'time' && !duration_months) {
    return { error: 'duration_months è obbligatorio per i piani a tempo' };
  }
  if (type === 'count' && !max_checkins) {
    return { error: 'max_checkins è obbligatorio per i piani a ingressi' };
  }

  return {
    payload: {
      name,
      type,
      duration_months: type === 'time' ? duration_months : null,
      max_checkins: type === 'count' ? max_checkins : null,
      price,
      is_promo: !!is_promo
    }
  };
};

// GET /api/plans - Price list for the current gym
exports.getPlans = async (req, res) => {
  try {
    const plans = await db('plans').where({ gym_id: req.gym }).orderBy('price', 'asc');
    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/plans - Create a new plan in the current gym's price list
exports.createPlan = async (req, res) => {
  try {
    const { error, payload } = buildPlanPayload(req.body);
    if (error) return res.status(400).json({ error });

    const [result] = await db('plans').insert({ ...payload, gym_id: req.gym }).returning('id');
    const id = result.id ? result.id : result;
    const plan = await db('plans').where({ id }).first();
    res.status(201).json(plan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/plans/:id - Update an existing plan (restricted to current gym)
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db('plans').where({ id, gym_id: req.gym }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Piano non trovato' });
    }

    const { error, payload } = buildPlanPayload(req.body);
    if (error) return res.status(400).json({ error });

    await db('plans').where({ id, gym_id: req.gym }).update(payload);
    const plan = await db('plans').where({ id }).first();
    res.json(plan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /api/plans/:id - Remove a plan (only if not already sold to clients)
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db('plans').where({ id, gym_id: req.gym }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Piano non trovato' });
    }

    // A plan referenced by sold memberships cannot be deleted (FK RESTRICT)
    const inUse = await db('client_memberships').where({ plan_id: id }).first();
    if (inUse) {
      return res.status(400).json({
        error: 'Impossibile eliminare: questo piano è già stato venduto ad almeno un cliente. Puoi modificarlo.'
      });
    }

    await db('plans').where({ id, gym_id: req.gym }).del();
    res.json({ message: 'Piano eliminato con successo' });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
