const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// POST /api/auth/register - Register a new gym
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'I campi name, email e password sono obbligatori' });
    }

    // Verify unique email
    const existingGym = await db('gyms').where({ email }).first();
    if (existingGym) {
      return res.status(400).json({ error: 'Questa email è già associata a una palestra registrata' });
    }

    // Hash password
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
      slug
    }).returning('id');
    const id = result.id ? result.id : result;

    const newGym = await db('gyms').where({ id }).first();
    delete newGym.password_hash; // Hide password hash

    res.status(201).json(newGym);
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/auth/login - Authenticate credentials and return signed JWT
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori' });
    }

    // Retrieve gym profile
    const gym = await db('gyms').where({ email }).first();
    if (!gym) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    if (gym.status !== 'active') {
      return res.status(403).json({ error: 'L\'account di questa palestra è sospeso' });
    }

    // Match password hash
    const passwordMatch = bcrypt.compareSync(password, gym.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Sign JWT (Owner)
    const secret = process.env.JWT_SECRET || 'supersecretkey_piupalestre';
    const token = jwt.sign(
      {
        gym_id: gym.id,
        email: gym.email,
        name: gym.name,
        is_admin: !!gym.is_admin,
        slug: gym.slug,
        role: 'owner'
      },
      secret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      gym: {
        id: gym.id,
        name: gym.name,
        email: gym.email,
        is_admin: !!gym.is_admin,
        slug: gym.slug,
        role: 'owner'
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/auth/gyms/slug/:slug - Publicly fetch gym info (e.g. name) by slug
exports.getGymBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const gym = await db('gyms').where({ slug }).first();
    if (!gym) {
      return res.status(404).json({ error: 'Palestra non trovata' });
    }
    res.json({
      name: gym.name,
      slug: gym.slug,
      status: gym.status
    });
  } catch (error) {
    console.error('Error fetching gym by slug:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/auth/login-by-slug - Authenticate inside a specific gym slug URL
exports.loginBySlug = async (req, res) => {
  try {
    const { email, password, slug } = req.body;

    if (!email || !password || !slug) {
      return res.status(400).json({ error: 'Email, password e slug sono obbligatori' });
    }

    // 1. Identifica la palestra dal path (slug)
    const gym = await db('gyms').where({ slug }).first();
    if (!gym) {
      return res.status(404).json({ error: 'Palestra non trovata' });
    }

    if (gym.status !== 'active') {
      return res.status(403).json({ error: 'L\'account di questa palestra è sospeso' });
    }

    let role = 'owner';
    let staffId = null;
    let userName = gym.name;
    
    // 2. Controlla se le credenziali corrispondono all'Owner (tabella gyms)
    if (email === gym.email) {
      const passwordMatch = bcrypt.compareSync(password, gym.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenziali non valide' });
      }
    } else {
      // 3. Se non è l'owner, cerca nella tabella staff
      const staffMember = await db('staff').where({ email, gym_id: gym.id }).first();
      if (!staffMember) {
        return res.status(401).json({ error: 'Credenziali non valide per questa palestra' });
      }
      if (staffMember.status !== 'active') {
        return res.status(403).json({ error: 'Questo account staff è stato sospeso' });
      }
      
      const staffPasswordMatch = bcrypt.compareSync(password, staffMember.password_hash);
      if (!staffPasswordMatch) {
        return res.status(401).json({ error: 'Credenziali non valide' });
      }
      
      role = staffMember.role;
      staffId = staffMember.id;
      userName = `${staffMember.first_name} ${staffMember.last_name}`;
    }

    const secret = process.env.JWT_SECRET || 'supersecretkey_piupalestre';
    const token = jwt.sign(
      {
        gym_id: gym.id,
        email: email, // L'email effettiva con cui si è loggato (proprietario o staff)
        name: userName,
        is_admin: !!gym.is_admin,
        slug: gym.slug,
        role: role,
        staff_id: staffId
      },
      secret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      gym: {
        id: gym.id,
        name: gym.name, // Nome della palestra
        user_name: userName, // Nome dell'operatore connesso
        email: email,
        is_admin: !!gym.is_admin,
        slug: gym.slug,
        role: role,
        staff_id: staffId
      }
    });
  } catch (error) {
    console.error('Login by slug error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
