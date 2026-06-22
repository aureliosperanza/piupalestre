/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('clients', function(table) {
      table.increments('id').primary();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').unique().notNullable();
      table.string('phone').notNullable();
      table.date('birth_date');
      table.date('membership_start');
      table.string('membership_type').defaultTo('monthly'); // monthly, quarterly, annual
      table.string('status').defaultTo('active'); // active, expired
      table.date('medical_certificate_expiry');
      table.timestamps(true, true);
    })
    .createTable('classes', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('instructor');
      table.integer('max_participants').notNullable().defaultTo(10);
      table.dateTime('start_time').notNullable();
      table.dateTime('end_time').notNullable();
      table.timestamps(true, true);
    })
    .createTable('bookings', function(table) {
      table.increments('id').primary();
      table.integer('client_id').unsigned().notNullable()
        .references('id').inTable('clients').onDelete('CASCADE');
      table.integer('class_id').unsigned().notNullable()
        .references('id').inTable('classes').onDelete('CASCADE');
      table.dateTime('booking_date').defaultTo(knex.fn.now());
      table.unique(['client_id', 'class_id']);
      table.timestamps(true, true);
    })
    .createTable('checkins', function(table) {
      table.increments('id').primary();
      table.integer('client_id').unsigned().notNullable()
        .references('id').inTable('clients').onDelete('CASCADE');
      table.dateTime('checkin_time').defaultTo(knex.fn.now());
      table.string('status').notNullable(); // allowed, denied
      table.string('reason'); // ok, membership_expired, certificate_expired
      table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('checkins')
    .dropTableIfExists('bookings')
    .dropTableIfExists('classes')
    .dropTableIfExists('clients');
};
