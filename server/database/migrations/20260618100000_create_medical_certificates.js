/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('medical_certificates', function(table) {
    table.increments('id').primary();
    table.integer('client_id').unsigned().notNullable()
      .references('id').inTable('clients').onDelete('CASCADE');
    table.integer('gym_id').unsigned().notNullable()
      .references('id').inTable('gyms').onDelete('CASCADE');
    table.string('file_path').notNullable(); // Percorso locale o URL dell'immagine
    table.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.text('rejection_reason');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('medical_certificates');
};
