/**
 * Tabella dei codici OTP per la verifica email dell'auto-registrazione pubblica.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('email_otps', function(table) {
    table.increments('id').primary();
    table.integer('gym_id').unsigned().notNullable()
      .references('id').inTable('gyms').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('code').notNullable();
    table.timestamp('expires_at').notNullable();
    table.integer('attempts').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['gym_id', 'email']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('email_otps');
};
