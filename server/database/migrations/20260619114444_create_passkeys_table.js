/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .alterTable('clients', function(table) {
      table.string('current_challenge').nullable();
    })
    .createTable('passkeys', function(table) {
      table.string('credential_id').primary();
      table.integer('client_id').unsigned().notNullable()
        .references('id').inTable('clients').onDelete('CASCADE');
      table.text('public_key').notNullable(); // Base64url encoded or Buffer/Blob
      table.integer('counter').notNullable();
      table.string('device_type').notNullable(); // 'singleDevice' | 'multiDevice'
      table.boolean('backed_up').notNullable();
      table.string('transports'); // JSON array or comma separated string
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('passkeys')
    .alterTable('clients', function(table) {
      table.dropColumn('current_challenge');
    });
};
