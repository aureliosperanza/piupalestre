const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_KEY || 'placeholder_key'
);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
const isExpired = (dateInput) => {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  return d < today;
};

// Calcola lo stato dell'abbonamento attivo dell'iscritto
const buildMembership = async (clientId) => {
  const m = await db('client_memberships')
    .join('plans', 'client_memberships.plan_id', 'plans.id')
    .where('client_memberships.client_id', clientId)
    .andWhere('client_memberships.status', 'active')
    .select('client_memberships.*', 'plans.name as plan_name', 'plans.type as plan_type')
    .orderBy('client_memberships.id', 'desc')
    .first();

  if (!m) return null;
  const expired = m.plan_type === 'time' ? isExpired(m.end_date) : (m.remaining_checkins != null && m.remaining_checkins <= 0);
  return {
    plan_name: m.plan_name,
    type: m.plan_type,
    end_date: m.end_date,
    remaining_checkins: m.remaining_checkins,
    status: expired ? 'expired' : 'active'
  };
};

// GET /api/member/me - Profilo + abbonamento dell'iscritto autenticato
exports.getMe = async (req, res) => {
  try {
    const c = req.member;
    const membership = await buildMembership(c.id);
    const pendingCert = await db('medical_certificates').where({ client_id: c.id, status: 'pending' }).first();
    const rejectedCert = await db('medical_certificates').where({ client_id: c.id, status: 'rejected' }).orderBy('id', 'desc').first();
    const hasPasskey = await db('passkeys').where({ client_id: c.id }).first();
    
    res.json({
      gym: { name: req.memberGym.name, slug: req.memberGym.slug },
      client: {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        gender: c.gender,
        birth_date: c.birth_date,
        tax_code: c.tax_code,
        birth_place: c.birth_place,
        province: c.province,
        medical_certificate_expiry: c.medical_certificate_expiry,
        pending_certificate: !!pendingCert,
        rejected_certificate: !pendingCert && rejectedCert ? rejectedCert.rejection_reason : null,
        has_passkey: !!hasPasskey
      },
      membership
    });
  } catch (error) {
    console.error('Member getMe error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/member/bookings - Corsi a cui l'iscritto è prenotato
exports.getBookings = async (req, res) => {
  try {
    const bookings = await db('bookings')
      .join('classes', 'bookings.class_id', 'classes.id')
      .where('bookings.client_id', req.member.id)
      .select('bookings.id as booking_id', 'classes.id as class_id', 'classes.name', 'classes.instructor', 'classes.weekday', 'classes.time_start', 'classes.time_end')
      .orderBy('classes.weekday', 'asc')
      .orderBy('classes.time_start', 'asc');
    res.json(bookings);
  } catch (error) {
    console.error('Member getBookings error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/member/classes - Palinsesto corsi della palestra, con flag "prenotato"
exports.getClasses = async (req, res) => {
  try {
    const gymId = req.member.gym_id;
    const classes = await db('classes')
      .select('classes.*')
      .count('bookings.id as current_participants')
      .leftJoin('bookings', 'classes.id', 'bookings.class_id')
      .where('classes.gym_id', gymId)
      .groupBy('classes.id')
      .orderBy('classes.weekday', 'asc')
      .orderBy('classes.time_start', 'asc');

    const mine = await db('bookings').where({ client_id: req.member.id }).select('class_id');
    const bookedSet = new Set(mine.map((b) => b.class_id));

    res.json(classes.map((c) => ({
      ...c,
      current_participants: parseInt(c.current_participants || 0, 10),
      booked: bookedSet.has(c.id)
    })));
  } catch (error) {
    console.error('Member getClasses error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/member/bookings - L'iscritto prenota se stesso a un corso
exports.createBooking = async (req, res) => {
  try {
    const { class_id } = req.body;
    if (!class_id) return res.status(400).json({ error: 'class_id obbligatorio' });

    const gymId = req.member.gym_id;
    const cls = await db('classes').where({ id: class_id, gym_id: gymId }).first();
    if (!cls) return res.status(404).json({ error: 'Corso non trovato' });

    // Certificato medico valido (stessa priorità del check-in)
    if (isExpired(req.member.medical_certificate_expiry)) {
      return res.status(400).json({ error: 'Certificato medico scaduto: rinnovalo per poter prenotare' });
    }

    // Serve un abbonamento attivo
    const membership = await buildMembership(req.member.id);
    if (!membership || membership.status !== 'active') {
      return res.status(400).json({ error: 'Ti serve un abbonamento attivo per prenotare' });
    }

    // Capienza
    const countRes = await db('bookings').where({ class_id, gym_id: gymId }).count('id as c').first();
    if (parseInt(countRes.c || 0, 10) >= cls.max_participants) {
      return res.status(400).json({ error: 'Il corso ha raggiunto la capienza massima' });
    }

    // Già prenotato?
    const dup = await db('bookings').where({ client_id: req.member.id, class_id }).first();
    if (dup) return res.status(400).json({ error: 'Sei già prenotato a questo corso' });

    await db('bookings').insert({ client_id: req.member.id, class_id, booking_date: db.fn.now(), gym_id: gymId });
    res.status(201).json({ success: true, message: 'Prenotazione effettuata!' });
  } catch (error) {
    console.error('Member createBooking error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /api/member/bookings/:id - L'iscritto annulla una propria prenotazione
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await db('bookings').where({ id, client_id: req.member.id }).first();
    if (!booking) return res.status(404).json({ error: 'Prenotazione non trovata' });

    await db('bookings').where({ id }).del();
    res.json({ success: true, message: 'Prenotazione annullata' });
  } catch (error) {
    console.error('Member cancelBooking error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/member/phone - Aggiorna il proprio recapito telefonico
exports.updatePhone = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Telefono obbligatorio' });

    await db('clients').where({ id: req.member.id }).update({ phone: phone.trim(), updated_at: db.fn.now() });
    res.json({ success: true, phone: phone.trim() });
  } catch (error) {
    console.error('Member updatePhone error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/member/profile - Aggiorna i dati anagrafici
exports.updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, email, gender, birth_date, tax_code, birth_place, province, phone } = req.body;
    
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Nome, cognome ed email sono obbligatori' });
    }

    // Controlla se l'email è già in uso da un altro cliente nella stessa palestra
    const existing = await db('clients')
      .where({ gym_id: req.member.gym_id, email: email.trim() })
      .whereNot({ id: req.member.id })
      .first();

    if (existing) {
      return res.status(400).json({ error: 'Questa email è già in uso' });
    }

    const data = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.trim(),
      gender: gender || 'M',
      birth_date: birth_date || null,
      tax_code: tax_code || null,
      birth_place: birth_place || null,
      province: province || null,
      phone: phone ? phone.trim() : null,
      updated_at: db.fn.now()
    };

    await db('clients').where({ id: req.member.id }).update(data);
    res.json({ success: true, message: 'Profilo aggiornato con successo' });
  } catch (error) {
    console.error('Member updateProfile error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/member/password - Aggiorna la password
exports.updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La password deve contenere almeno 6 caratteri' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    await db('clients').where({ id: req.member.id }).update({ password_hash, updated_at: db.fn.now() });

    res.json({ success: true, message: 'Password aggiornata con successo' });
  } catch (error) {
    console.error('Member updatePassword error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/member/qr-token - Genera token QR dinamico per il check-in
exports.getQrToken = async (req, res) => {
  try {
    const payload = {
      client_id: req.member.id,
      gym_id: req.member.gym_id,
      purpose: 'checkin'
    };
    // Scadenza a 10 secondi
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '10s' });
    res.json({ token });
  } catch (error) {
    console.error('Member getQrToken error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/member/certificate
exports.uploadCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }
    
    // Genera un nome file univoco
    const ext = req.file.originalname.split('.').pop();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `cert-${req.member.id}-${uniqueSuffix}.${ext}`;

    // Upload su Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Errore durante il caricamento del file su cloud' });
    }

    // Ottieni URL pubblico
    const { data: publicUrlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(filename);
      
    const publicUrl = publicUrlData.publicUrl;

    await db('medical_certificates').insert({
      client_id: req.member.id,
      gym_id: req.member.gym_id,
      file_path: publicUrl,
      status: 'pending'
    });

    res.json({ success: true, message: 'Certificato inviato in approvazione' });
  } catch (error) {
    console.error('Error uploading certificate:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
