const bcrypt = require('bcryptjs');

// Helper: add N months to a YYYY-MM-DD string, returns YYYY-MM-DD
const addMonths = (dateStr, months) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Delete in FK-safe order
  await knex('client_memberships').del();
  await knex('checkins').del();
  await knex('bookings').del();
  await knex('plans').del();
  await knex('classes').del();
  await knex('clients').del();
  await knex('leads').del();
  await knex('gyms').del();

  const passwordHash = bcrypt.hashSync('password123', 10);

  // Insert gyms (Tenants & Superadmin)
  await knex('gyms').insert([
    { id: 1, name: 'Iron Gym', email: 'iron@gym.com', password_hash: passwordHash, status: 'active', is_admin: false, slug: 'iron-gym' },
    { id: 2, name: 'Zen Yoga', email: 'zen@yoga.com', password_hash: passwordHash, status: 'active', is_admin: false, slug: 'zen-yoga' },
    { id: 3, name: 'Super Admin', email: 'admin@piupalestre.it', password_hash: passwordHash, status: 'active', is_admin: true, slug: 'super-admin' }
  ]);

  // ---- PRICE LIST (plans) ----
  await knex('plans').insert([
    // Iron Gym (gym_id: 1)
    { name: 'Mensile Open',          gym_id: 1, type: 'time',  duration_months: 1,    max_checkins: null, price: 50 },
    { name: 'Promo Estate 3 Mesi',   gym_id: 1, type: 'time',  duration_months: 3,    max_checkins: null, price: 120 },
    { name: 'Carnet 10 Ingressi',    gym_id: 1, type: 'count', duration_months: null, max_checkins: 10,   price: 70 },
    // Zen Yoga (gym_id: 2) — minimal list to keep the second tenant demo usable
    { name: 'Yoga Mensile',          gym_id: 2, type: 'time',  duration_months: 1,    max_checkins: null, price: 60 },
    { name: 'Carnet 5 Lezioni',      gym_id: 2, type: 'count', duration_months: null, max_checkins: 5,    price: 45 }
  ]);

  const plans = await knex('plans').select('id', 'name', 'gym_id');
  const planByName = {};
  plans.forEach(p => { planByName[`${p.gym_id}:${p.name}`] = p.id; });

  // ---- CLIENTS (anagrafica only, no membership fields) ----
  await knex('clients').insert([
    // Iron Gym
    { first_name: 'Mario',  last_name: 'Rossi',   email: 'mario.rossi@email.com',  phone: '+393331234567', birth_date: '1990-05-15', medical_certificate_expiry: '2027-01-20', gym_id: 1 },
    { first_name: 'Luigi',  last_name: 'Bianchi', email: 'luigi.bianchi@email.com', phone: '+393339876543', birth_date: '1985-08-20', medical_certificate_expiry: '2026-05-01', gym_id: 1 }, // cert expired
    { first_name: 'Giulia', last_name: 'Verde',   email: 'giulia.verde@email.com', phone: '+393471112222', birth_date: '1995-12-02', medical_certificate_expiry: '2026-12-15', gym_id: 1 },
    // Zen Yoga
    { first_name: 'Anna',   last_name: 'Neri',    email: 'anna.neri@email.com',    phone: '+393493334444', birth_date: '1992-03-10', medical_certificate_expiry: '2026-06-10', gym_id: 2 },
    { first_name: 'Marco',  last_name: 'Bruni',   email: 'marco.bruni@email.com',  phone: '+393285556666', birth_date: '1988-11-25', medical_certificate_expiry: '2026-09-30', gym_id: 2 }
  ]);

  const clients = await knex('clients').select('id', 'first_name', 'gym_id');
  const clientByName = {};
  clients.forEach(c => { clientByName[c.first_name] = c; });

  // ---- SOLD CONTRACTS (client_memberships) ----
  // Demonstrates every state: active time, expired time, exhausted count, active count.
  await knex('client_memberships').insert([
    // Mario: active monthly (started 25/05 -> valid through 25/06)
    { client_id: clientByName['Mario'].id, plan_id: planByName['1:Mensile Open'], start_date: '2026-05-25', end_date: addMonths('2026-05-25', 1), remaining_checkins: null, status: 'active' },
    // Luigi: time plan already past its end_date (will be blocked — and cert is expired too)
    { client_id: clientByName['Luigi'].id, plan_id: planByName['1:Promo Estate 3 Mesi'], start_date: '2026-03-01', end_date: addMonths('2026-03-01', 3), remaining_checkins: null, status: 'active' },
    // Giulia: count carnet with no entries left (will be blocked: "Ingressi Esauriti")
    { client_id: clientByName['Giulia'].id, plan_id: planByName['1:Carnet 10 Ingressi'], start_date: '2026-04-01', end_date: null, remaining_checkins: 0, status: 'active' },
    // Anna: active Zen monthly
    { client_id: clientByName['Anna'].id, plan_id: planByName['2:Yoga Mensile'], start_date: '2026-06-01', end_date: addMonths('2026-06-01', 1), remaining_checkins: null, status: 'active' },
    // Marco: active Zen carnet with entries left
    { client_id: clientByName['Marco'].id, plan_id: planByName['2:Carnet 5 Lezioni'], start_date: '2026-05-20', end_date: null, remaining_checkins: 3, status: 'active' }
  ]);

  // ---- CLASSES (palinsesto settimanale ricorrente; weekday 0=Lun ... 6=Dom) ----
  await knex('classes').insert([
    { name: 'Corso Pilates',       instructor: 'Elena Valeri',  max_participants: 10, weekday: 0, time_start: '18:00', time_end: '19:00', gym_id: 1 },
    { name: 'Functional Training', instructor: 'Stefano Forti', max_participants: 8,  weekday: 0, time_start: '19:15', time_end: '20:15', gym_id: 1 },
    { name: 'Corso Pilates',       instructor: 'Elena Valeri',  max_participants: 10, weekday: 2, time_start: '18:00', time_end: '19:00', gym_id: 1 },
    { name: 'Yoga Vinyasa',        instructor: 'Chiara Corti',  max_participants: 12, weekday: 1, time_start: '09:00', time_end: '10:00', gym_id: 2 },
    { name: 'Spinning Class',      instructor: 'Roberto Galli', max_participants: 2,  weekday: 3, time_start: '13:00', time_end: '14:00', gym_id: 2 }
  ]);

  const classes = await knex('classes').select('id', 'name', 'gym_id');
  const classByName = {};
  classes.forEach(c => { classByName[c.name] = c; });

  // ---- BOOKINGS ----
  await knex('bookings').insert([
    { client_id: clientByName['Mario'].id, class_id: classByName['Corso Pilates'].id, booking_date: '2026-06-06 10:00:00', gym_id: 1 },
    { client_id: clientByName['Luigi'].id, class_id: classByName['Corso Pilates'].id, booking_date: '2026-06-06 11:30:00', gym_id: 1 },
    { client_id: clientByName['Anna'].id,  class_id: classByName['Yoga Vinyasa'].id,  booking_date: '2026-06-06 10:15:00', gym_id: 2 },
    { client_id: clientByName['Marco'].id, class_id: classByName['Spinning Class'].id, booking_date: '2026-06-06 11:00:00', gym_id: 2 }
  ]);

  // ---- CHECKINS (history log) ----
  await knex('checkins').insert([
    { client_id: clientByName['Mario'].id,  checkin_time: '2026-06-06 08:30:00', status: 'allowed', reason: 'ok', gym_id: 1 },
    { client_id: clientByName['Luigi'].id,  checkin_time: '2026-06-06 09:00:00', status: 'denied', reason: 'Certificato Medico Scaduto', gym_id: 1 },
    { client_id: clientByName['Giulia'].id, checkin_time: '2026-06-06 17:00:00', status: 'denied', reason: 'Ingressi Esauriti', gym_id: 1 },
    { client_id: clientByName['Anna'].id,   checkin_time: '2026-06-06 08:45:00', status: 'allowed', reason: 'ok', gym_id: 2 }
  ]);

  // ---- LEADS ----
  await knex('leads').insert([
    { name: 'Valerio Rossi',  gym_name: 'Crossfit Roma',          city: 'Roma',   phone: '+393339998887', email: 'info@crossfitroma.it',        status: 'new' },
    { name: 'Elena Bianchi',  gym_name: 'Fitness Club Milano',    city: 'Milano', phone: '+393337776665', email: 'elena@fitnessclubmilano.it',  status: 'contacted' },
    { name: 'Roberto Verdi',  gym_name: 'Palestra Torino Active', city: 'Torino', phone: '+393335554443', email: 'roberto@torinoactive.it',     status: 'converted' }
  ]);
};
