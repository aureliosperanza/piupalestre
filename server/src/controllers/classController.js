const db = require('../config/db');

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

// Checks whether a client currently holds a valid active membership
const hasActiveMembership = async (clientId) => {
  const membership = await db('client_memberships')
    .join('plans', 'client_memberships.plan_id', 'plans.id')
    .where('client_memberships.client_id', clientId)
    .andWhere('client_memberships.status', 'active')
    .select('client_memberships.*', 'plans.type as plan_type')
    .orderBy('client_memberships.id', 'desc')
    .first();

  if (!membership) return false;
  if (membership.plan_type === 'time') {
    return !isExpired(membership.end_date);
  }
  return membership.remaining_checkins > 0;
};

// GET /api/classes - List recurring courses with booking counts (scoped to current gym)
exports.getClasses = async (req, res) => {
  try {
    const classes = await db('classes')
      .select('classes.*')
      .count('bookings.id as current_participants')
      .leftJoin('bookings', 'classes.id', 'bookings.class_id')
      .where('classes.gym_id', req.gym)
      .groupBy('classes.id')
      .orderBy('classes.weekday', 'asc')
      .orderBy('classes.time_start', 'asc');

    const formatted = classes.map(c => ({
      ...c,
      current_participants: parseInt(c.current_participants || 0, 10)
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Validate & normalize the recurring course payload
const buildClassPayload = (body) => {
  const { name, instructor, max_participants, weekday, time_start, time_end } = body;

  if (!name || weekday === undefined || weekday === null || !time_start || !time_end) {
    return { error: 'Nome, giorno della settimana e fascia oraria sono obbligatori' };
  }
  const wd = Number(weekday);
  if (Number.isNaN(wd) || wd < 0 || wd > 6) {
    return { error: 'Giorno della settimana non valido (0=Lun ... 6=Dom)' };
  }
  if (time_end <= time_start) {
    return { error: "L'orario di fine deve essere successivo a quello di inizio" };
  }
  const max = parseInt(max_participants, 10);

  return {
    payload: {
      name,
      instructor: instructor || null,
      max_participants: Number.isNaN(max) || max < 1 ? 1 : max,
      weekday: wd,
      time_start,
      time_end
    }
  };
};

// GET /api/classes/:id/bookings - List the clients enrolled in a course (scoped to current gym)
exports.getClassBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const cls = await db('classes').where({ id, gym_id: req.gym }).first();
    if (!cls) return res.status(404).json({ error: 'Corso non trovato' });

    const participants = await db('bookings')
      .join('clients', 'bookings.client_id', 'clients.id')
      .where('bookings.class_id', id)
      .andWhere('bookings.gym_id', req.gym)
      .select(
        'bookings.id as booking_id',
        'clients.id as client_id',
        'clients.first_name',
        'clients.last_name',
        'clients.email',
        'bookings.booking_date'
      )
      .orderBy('clients.first_name', 'asc');

    res.json(participants);
  } catch (error) {
    console.error('Error fetching class bookings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/classes - Create a recurring course
exports.createClass = async (req, res) => {
  try {
    const { error, payload } = buildClassPayload(req.body);
    if (error) return res.status(400).json({ error });

    const [id] = await db('classes').insert({ ...payload, gym_id: req.gym });
    const created = await db('classes').where({ id }).first();
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/classes/:id - Update a recurring course (scoped to current gym)
exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('classes').where({ id, gym_id: req.gym }).first();
    if (!existing) return res.status(404).json({ error: 'Corso non trovato' });

    const { error, payload } = buildClassPayload(req.body);
    if (error) return res.status(400).json({ error });

    await db('classes').where({ id, gym_id: req.gym }).update(payload);
    const updated = await db('classes').where({ id }).first();
    res.json(updated);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// DELETE /api/classes/:id - Remove a recurring course (its bookings cascade)
exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('classes').where({ id, gym_id: req.gym }).first();
    if (!existing) return res.status(404).json({ error: 'Corso non trovato' });

    await db('classes').where({ id, gym_id: req.gym }).del();
    res.json({ message: 'Corso eliminato con successo' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/bookings - Book slot in a class (restricted to current gym)
exports.createBooking = async (req, res) => {
  try {
    const { client_id, class_id } = req.body;

    if (!client_id || !class_id) {
      return res.status(400).json({ error: 'client_id and class_id are required fields' });
    }

    // 1. Fetch Client and check if active & belongs to this gym
    const client = await db('clients').where({ id: client_id, gym_id: req.gym }).first();
    if (!client) {
      return res.status(404).json({ error: 'Cliente non trovato in questa palestra' });
    }

    // Certificato medico valido (stessa priorità del check-in)
    if (isExpired(client.medical_certificate_expiry)) {
      return res.status(400).json({ error: 'Impossibile prenotare: certificato medico scaduto' });
    }

    if (!(await hasActiveMembership(client_id))) {
      return res.status(400).json({ error: 'Impossibile prenotare: il cliente non ha un abbonamento attivo' });
    }

    // 2. Fetch Class and check capacity & belongs to this gym
    const classRecord = await db('classes').where({ id: class_id, gym_id: req.gym }).first();
    if (!classRecord) {
      return res.status(404).json({ error: 'Classe non trovata in questa palestra' });
    }

    const bookingCountResult = await db('bookings')
      .where({ class_id, gym_id: req.gym })
      .count('id as count')
      .first();
    
    const currentCount = parseInt(bookingCountResult.count || 0, 10);
    if (currentCount >= classRecord.max_participants) {
      return res.status(400).json({ error: 'La classe ha raggiunto la capienza massima' });
    }

    // 3. Check if client already booked this class
    const existingBooking = await db('bookings')
      .where({ client_id, class_id, gym_id: req.gym })
      .first();
    if (existingBooking) {
      return res.status(400).json({ error: 'Il cliente è già iscritto a questa classe' });
    }

    // 4. Insert booking
    await db('bookings').insert({
      client_id,
      class_id,
      booking_date: db.fn.now(),
      gym_id: req.gym
    });

    res.status(201).json({ message: 'Prenotazione registrata con successo' });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
