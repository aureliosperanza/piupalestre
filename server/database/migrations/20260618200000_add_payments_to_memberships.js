/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('client_memberships', function(table) {
    table.decimal('assigned_price', 8, 2).defaultTo(0);
    table.decimal('paid_amount', 8, 2).defaultTo(0);
    table.enu('payment_status', ['paid', 'unpaid', 'partial']).defaultTo('unpaid');
  });

  // Data migration: set existing memberships as paid with their plan price
  const plans = await knex('plans').select('id', 'price');
  for (const plan of plans) {
    await knex('client_memberships')
      .where('plan_id', plan.id)
      .update({
        assigned_price: plan.price,
        paid_amount: plan.price,
        payment_status: 'paid'
      });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('client_memberships', function(table) {
    table.dropColumn('assigned_price');
    table.dropColumn('paid_amount');
    table.dropColumn('payment_status');
  });
};
