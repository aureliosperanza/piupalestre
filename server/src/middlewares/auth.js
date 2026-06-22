const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateGym = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accesso negato: token mancante o non valido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'supersecretkey_piupalestre';
    const decoded = jwt.verify(token, secret);
    
    // Check database to ensure gym is active
    const gym = await db('gyms').where({ id: decoded.gym_id }).first();
    if (!gym) {
      return res.status(401).json({ error: 'Accesso negato: palestra non trovata' });
    }
    
    if (gym.status !== 'active') {
      return res.status(403).json({ error: 'L\'account di questa palestra è sospeso' });
    }

    req.gym = decoded.gym_id;
    // req.gym_user holds the underlying tenant configuration
    req.gym_user = gym;
    // req.staff contains the operator's runtime identity
    req.staff = {
      role: decoded.role || 'owner',
      id: decoded.staff_id || null,
      email: decoded.email
    };
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({ error: 'Accesso negato: token non valido o scaduto' });
  }
};

const requireSuperadmin = (req, res, next) => {
  if (!req.gym_user || !req.gym_user.is_admin) {
    return res.status(403).json({ error: 'Accesso negato: permessi amministratore richiesti' });
  }
  next();
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.staff || !allowedRoles.includes(req.staff.role)) {
      return res.status(403).json({ error: 'Accesso negato: permessi insufficienti per questa operazione' });
    }
    next();
  };
};

module.exports = { authenticateGym, requireSuperadmin, requireRole };
