exports.up = function (knex) {
  return knex.schema.createTable('staff', (table) => {
    table.increments('id').primary();
    table.integer('gym_id').unsigned().notNullable();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable();
    table.string('password_hash').notNullable();
    table.enum('role', ['admin', 'reception', 'trainer']).defaultTo('reception');
    table.enum('status', ['active', 'suspended']).defaultTo('active');
    table.timestamps(true, true);

    table.foreign('gym_id').references('id').inTable('gyms').onDelete('CASCADE');
    table.unique(['gym_id', 'email']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('staff');
};
