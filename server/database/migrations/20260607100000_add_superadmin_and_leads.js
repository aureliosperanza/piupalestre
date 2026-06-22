/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('leads', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('gym_name').notNullable();
      table.string('city').notNullable();
      table.string('phone').notNullable();
      table.string('email').notNullable();
      table.string('status').defaultTo('new'); // new, contacted, converted, archived
      table.timestamps(true, true);
    })
    .alterTable('gyms', function(table) {
      table.boolean('is_admin').defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .alterTable('gyms', function(table) {
      table.dropColumn('is_admin');
    })
    .dropTableIfExists('leads');
};
