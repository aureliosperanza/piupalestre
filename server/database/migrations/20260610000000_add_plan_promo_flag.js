/**
 * Adds an 'is_promo' flag to plans so the gym manager can mark a plan as a promotion.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('plans', function(table) {
    table.boolean('is_promo').notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('plans', function(table) {
    table.dropColumn('is_promo');
  });
};
