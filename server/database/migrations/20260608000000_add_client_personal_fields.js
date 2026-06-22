/**
 * Adds personal registry fields collected by the client form (gender, birth place,
 * province, tax code, medical certificate file) and fixes the email uniqueness so
 * it is scoped per gym instead of being globally unique across all tenants.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('clients', function(table) {
    table.string('gender').defaultTo('M');         // M, F, Other
    table.string('birth_place');                   // Città di nascita
    table.string('province');                      // Provincia di nascita (sigla)
    table.string('tax_code');                      // Codice fiscale
    table.string('certificate_file_name');         // Stored medical certificate filename
  });

  // Replace the global-unique email with a per-gym composite unique constraint
  await knex.schema.alterTable('clients', function(table) {
    table.dropUnique('email');
    table.unique(['gym_id', 'email']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('clients', function(table) {
    table.dropUnique(['gym_id', 'email']);
    table.unique('email');
  });

  await knex.schema.alterTable('clients', function(table) {
    table.dropColumn('gender');
    table.dropColumn('birth_place');
    table.dropColumn('province');
    table.dropColumn('tax_code');
    table.dropColumn('certificate_file_name');
  });
};
