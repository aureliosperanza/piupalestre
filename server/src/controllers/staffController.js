const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/staff
exports.getStaff = async (req, res) => {
  try {
    const staff = await db('staff')
      .where({ gym_id: req.gym })
      .select('id', 'first_name', 'last_name', 'email', 'role', 'status', 'created_at');
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/staff
exports.createStaff = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
    }

    // Uniqueness checks for email within the gym context
    const existingStaff = await db('staff').where({ gym_id: req.gym, email }).first();
    const existingOwner = await db('gyms').where({ id: req.gym, email }).first();
    if (existingStaff || existingOwner) {
      return res.status(400).json({ error: 'Questa email è già in uso nella tua palestra' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const [result] = await db('staff').insert({
      first_name,
      last_name,
      email,
      phone,
      role: role || 'trainer',
      password_hash: passwordHash,
      status: 'active',
      gym_id: req.gym
    }).returning('id');
    const id = result.id ? result.id : result;

    const newStaff = await db('staff').where({ id }).first();
    delete newStaff.password_hash;
    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/staff/:id
exports.updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, password } = req.body;

    const staffMember = await db('staff').where({ id, gym_id: req.gym }).first();
    if (!staffMember) {
      return res.status(404).json({ error: 'Membro dello staff non trovato' });
    }

    const updates = {};
    if (role) updates.role = role;
    if (status) updates.status = status;
    if (password) updates.password_hash = bcrypt.hashSync(password, 10);

    if (Object.keys(updates).length > 0) {
      updates.updated_at = db.fn.now();
      await db('staff').where({ id }).update(updates);
    }

    const updatedStaff = await db('staff').where({ id }).first();
    delete updatedStaff.password_hash;
    res.json(updatedStaff);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /api/staff/:id
exports.deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const staffMember = await db('staff').where({ id, gym_id: req.gym }).first();
    if (!staffMember) {
      return res.status(404).json({ error: 'Membro dello staff non trovato' });
    }

    await db('staff').where({ id }).delete();
    res.json({ success: true, message: 'Account staff eliminato' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
