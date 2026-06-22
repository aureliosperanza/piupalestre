const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_TTL_MIN = 10;       // validità codice in minuti
const OTP_MAX_ATTEMPTS = 5;   // tentativi massimi di verifica
const TOKEN_TTL = '15m';      // validità del token di verifica email

const getSecret = () => process.env.JWT_SECRET || 'supersecretkey_piupalestre';

// Risolve la palestra dallo slug e ne verifica lo stato attivo
const resolveGym = async (slug) => {
  const gym = await db('gyms').where({ slug }).first();
  if (!gym) return { error: 'Palestra non trovata', status: 404 };
  if (gym.status !== 'active') return { error: 'Questa palestra non è al momento attiva', status: 403 };
  return { gym };
};

// GET /api/public/gyms/:slug - Info pubbliche della palestra
exports.getGym = async (req, res) => {
  try {
    const r = await resolveGym(req.params.slug);
    if (r.error) return res.status(r.status).json({ error: r.error });
    res.json({ name: r.gym.name, slug: r.gym.slug });
  } catch (error) {
    console.error('Public getGym error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/public/gyms/:slug/request-otp - Genera e invia un codice OTP all'email
exports.requestOtp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obbligatoria' });

    const r = await resolveGym(slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 cifre
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    // Un solo codice valido per (gym, email): rimuoviamo i precedenti
    await db('email_otps').where({ gym_id: r.gym.id, email }).del();
    await db('email_otps').insert({ gym_id: r.gym.id, email, code, expires_at: expiresAt });

    let delivered = false;
    try {
      delivered = await sendOtpEmail(email, code, r.gym.name);
    } catch (mailErr) {
      console.error('Errore invio OTP:', mailErr.message);
    }

    const response = { message: 'Se l\'email è valida, riceverai un codice di verifica.' };
    // In sviluppo (senza SMTP) restituiamo il codice per poter testare il flusso
    if (!delivered && process.env.NODE_ENV !== 'production') {
      response.devCode = code;
    }
    res.json(response);
  } catch (error) {
    console.error('Public requestOtp error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Verifica e consuma il codice OTP. Ritorna { error, status } se fallisce, null se ok.
const verifyAndConsumeOtp = async (gymId, email, code) => {
  const otp = await db('email_otps').where({ gym_id: gymId, email }).orderBy('id', 'desc').first();
  if (!otp) return { error: 'Nessun codice attivo: richiedine uno nuovo', status: 400 };

  if (new Date(otp.expires_at) < new Date()) {
    await db('email_otps').where({ id: otp.id }).del();
    return { error: 'Codice scaduto: richiedine uno nuovo', status: 400 };
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await db('email_otps').where({ id: otp.id }).del();
    return { error: 'Troppi tentativi: richiedi un nuovo codice', status: 429 };
  }
  if (otp.code !== String(code).trim()) {
    await db('email_otps').where({ id: otp.id }).update({ attempts: otp.attempts + 1 });
    return { error: 'Codice non valido', status: 400 };
  }

  await db('email_otps').where({ id: otp.id }).del(); // monouso
  return null;
};

// POST /api/public/gyms/:slug/verify-otp - Verifica il codice e rilascia un token + dati esistenti
exports.verifyOtp = async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email e codice sono obbligatori' });

    const r = await resolveGym(slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const otpErr = await verifyAndConsumeOtp(r.gym.id, email, code);
    if (otpErr) return res.status(otpErr.status).json({ error: otpErr.error });

    const token = jwt.sign(
      { gym_id: r.gym.id, email, purpose: 'public_registration' },
      getSecret(),
      { expiresIn: TOKEN_TTL }
    );

    const client = await db('clients').where({ gym_id: r.gym.id, email }).first();
    // "Completo/gia iscritto" = ha gia l'anagrafica di base (data di nascita),
    // quindi non e un semplice stub di contatti pre-caricato dalla palestra.
    const complete = client ? !!client.birth_date : false;
    res.json({
      token,
      exists: !!client,
      complete,
      client: client
        ? {
            first_name: client.first_name,
            last_name: client.last_name,
            gender: client.gender,
            birth_date: client.birth_date,
            tax_code: client.tax_code,
            birth_place: client.birth_place,
            province: client.province,
            phone: client.phone
          }
        : null
    });
  } catch (error) {
    console.error('Public verifyOtp error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/public/gyms/:slug/register - Registra/completa l'iscrizione (richiede token OTP)
exports.register = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      verificationToken,
      email,
      first_name,
      last_name,
      gender,
      birth_date,
      tax_code,
      birth_place,
      province,
      phone,
      password
    } = req.body;

    if (!email || !first_name || !last_name || !phone || !password) {
      return res.status(400).json({ error: 'Nome, cognome, email, telefono e password sono obbligatori' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La password deve contenere almeno 6 caratteri' });
    }

    const r = await resolveGym(slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    // Verifica del token OTP: deve corrispondere a email + palestra
    let payload;
    try {
      payload = jwt.verify(verificationToken || '', getSecret());
    } catch (e) {
      return res.status(401).json({ error: 'Verifica email scaduta o non valida: ripeti la procedura' });
    }
    if (payload.purpose !== 'public_registration' || payload.email !== email || payload.gym_id !== r.gym.id) {
      return res.status(401).json({ error: 'Verifica email non valida per questa iscrizione' });
    }

    const data = {
      first_name,
      last_name,
      gender: gender || 'M',
      birth_date: birth_date || null,
      tax_code: tax_code || null,
      birth_place: birth_place || null,
      province: province || null,
      phone,
      password_hash: bcrypt.hashSync(password, 10)
    };

    const existing = await db('clients').where({ gym_id: r.gym.id, email }).first();
    if (existing) {
      await db('clients').where({ id: existing.id }).update({ ...data, updated_at: db.fn.now() });
      return res.json({ success: true, mode: 'updated', message: 'Iscrizione completata con successo!' });
    }

    await db('clients').insert({ ...data, email, gym_id: r.gym.id });
    res.status(201).json({ success: true, mode: 'created', message: 'Iscrizione completata con successo!' });
  } catch (error) {
    console.error('Public register error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/public/gyms/:slug/member-login - Login iscritto via OTP o Password → token membro
exports.memberLogin = async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, code, password } = req.body;
    
    if (!email) return res.status(400).json({ error: 'Email obbligatoria' });
    if (!code && !password) return res.status(400).json({ error: 'Codice o password obbligatori' });

    const r = await resolveGym(slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const client = await db('clients').where({ gym_id: r.gym.id, email }).first();
    if (!client) {
      return res.status(404).json({ error: 'Non risulti iscritto a questa palestra. Registrati prima.' });
    }

    if (password) {
      if (!client.password_hash) {
        return res.status(401).json({ error: 'Non hai ancora impostato una password. Accedi con il codice OTP.' });
      }
      const passwordMatch = bcrypt.compareSync(password, client.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Password errata' });
      }
    } else {
      const otpErr = await verifyAndConsumeOtp(r.gym.id, email, code);
      if (otpErr) return res.status(otpErr.status).json({ error: otpErr.error });
    }

    const token = jwt.sign(
      { client_id: client.id, gym_id: r.gym.id, email, purpose: 'member' },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.json({ token, name: `${client.first_name} ${client.last_name}`, gym: { name: r.gym.name, slug: r.gym.slug } });
  } catch (error) {
    console.error('Member login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
