const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Autentica un iscritto tramite token "member" (rilasciato dal login OTP)
const memberAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accesso negato: token mancante' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'supersecretkey_piupalestre';
    const decoded = jwt.verify(authHeader.split(' ')[1], secret);

    if (decoded.purpose !== 'member') {
      return res.status(401).json({ error: 'Token non valido' });
    }

    // La palestra deve essere attiva e il cliente deve esistere
    const gym = await db('gyms').where({ id: decoded.gym_id }).first();
    if (!gym || gym.status !== 'active') {
      return res.status(403).json({ error: 'Palestra non attiva' });
    }
    const client = await db('clients').where({ id: decoded.client_id, gym_id: decoded.gym_id }).first();
    if (!client) {
      return res.status(401).json({ error: 'Iscritto non trovato' });
    }

    req.member = client;
    req.memberGym = gym;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
};

module.exports = { memberAuth };
