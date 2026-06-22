/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('gyms', function(table) {
    table.string('slug').unique().index();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('gyms', function(table) {
    table.dropIndex('slug');
    table.dropColumn('slug');
  });
};
