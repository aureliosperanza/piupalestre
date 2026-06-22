/**
 * Trasforma i corsi da occorrenze datate (start_time/end_time assoluti) a
 * palinsesto settimanale ricorrente: giorno della settimana + fascia oraria.
 *
 * weekday: 0 = Lunedì ... 6 = Domenica
 * time_start / time_end: stringhe 'HH:MM'
 *
 * Le vecchie colonne start_time/end_time restano dormienti (non più usate) per
 * non forzare una ricostruzione tabella su SQLite con le FK di 'bookings'.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('classes', function(table) {
    table.integer('weekday');       // 0=Lun ... 6=Dom
    table.string('time_start');     // 'HH:MM'
    table.string('time_end');       // 'HH:MM'
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('classes', function(table) {
    table.dropColumn('weekday');
    table.dropColumn('time_start');
    table.dropColumn('time_end');
  });
};
