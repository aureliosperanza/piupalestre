/**
 * Separates the client registry from the purchase of services.
 *
 * - 'plans'  -> the gym price list (time-based or count-based products)
 * - 'client_memberships' -> contracts actually sold to a client
 *
 * NOTE: the legacy columns on 'clients' (membership_type, membership_start, status)
 * are intentionally left dormant (no longer read/written) instead of being dropped,
 * to avoid an SQLite table rebuild that would disturb the existing foreign keys
 * coming from 'bookings' and 'checkins'.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('plans', function(table) {
    table.increments('id').primary();
    table.integer('gym_id').unsigned().notNullable()
      .references('id').inTable('gyms').onDelete('CASCADE');
    table.string('name').notNullable();
    table.enu('type', ['time', 'count']).notNullable();
    table.integer('duration_months');   // null for 'count' plans
    table.integer('max_checkins');       // null for 'time' plans
    table.decimal('price', 8, 2).notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('client_memberships', function(table) {
    table.increments('id').primary();
    table.integer('client_id').unsigned().notNullable()
      .references('id').inTable('clients').onDelete('CASCADE');
    table.integer('plan_id').unsigned().notNullable()
      .references('id').inTable('plans').onDelete('RESTRICT');
    table.date('start_date').notNullable();
    table.date('end_date');               // null for 'count' memberships
    table.integer('remaining_checkins');  // null for 'time' memberships
    table.enu('status', ['active', 'expired', 'cancelled']).notNullable().defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('client_memberships');
  await knex.schema.dropTableIfExists('plans');
};
