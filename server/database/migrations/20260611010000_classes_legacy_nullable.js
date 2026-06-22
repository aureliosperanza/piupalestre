/**
 * Rende nullable le vecchie colonne start_time/end_time dei corsi, ora sostituite
 * dal modello ricorrente (weekday + time_start/time_end). Necessario perché erano
 * NOT NULL e bloccherebbero la creazione dei corsi ricorrenti.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('classes', function(table) {
    table.dateTime('start_time').nullable().alter();
    table.dateTime('end_time').nullable().alter();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('classes', function(table) {
    table.dateTime('start_time').notNullable().alter();
    table.dateTime('end_time').notNullable().alter();
  });
};
