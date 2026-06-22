/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('gyms', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').unique().notNullable();
      table.string('password_hash').notNullable();
      table.string('status').defaultTo('active'); // active, suspended
      table.timestamps(true, true);
    })
    .alterTable('clients', function(table) {
      table.integer('gym_id').unsigned().references('id').inTable('gyms').onDelete('CASCADE');
    })
    .alterTable('classes', function(table) {
      table.integer('gym_id').unsigned().references('id').inTable('gyms').onDelete('CASCADE');
    })
    .alterTable('bookings', function(table) {
      table.integer('gym_id').unsigned().references('id').inTable('gyms').onDelete('CASCADE');
    })
    .alterTable('checkins', function(table) {
      table.integer('gym_id').unsigned().references('id').inTable('gyms').onDelete('CASCADE');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('checkins', function(table) {
      table.dropColumn('gym_id');
    })
    .alterTable('bookings', function(table) {
      table.dropColumn('gym_id');
    })
    .alterTable('classes', function(table) {
      table.dropColumn('gym_id');
    })
    .alterTable('clients', function(table) {
      table.dropColumn('gym_id');
    })
    .dropTableIfExists('gyms');
};
