/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('clientId').references('id').inTable('users').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.decimal('budget', 15, 2).notNullable();
    table.timestamp('deadline').notNullable();
    table.enum('status', ['open', 'in_progress', 'completed', 'cancelled']).defaultTo('open');
    table.integer('category').defaultTo(0);
    table.boolean('isRemote').defaultTo(false);
    table.string('location');
    table.jsonb('requirements').defaultTo('[]');
    table.jsonb('tags').defaultTo('[]');
    table.integer('proposalCount').defaultTo(0);
    table.uuid('acceptedProposalId');
    table.uuid('assignedFreelancerId').references('id').inTable('users');
    table.timestamp('acceptedAt');
    table.timestamp('completedAt');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt');

    // Indexes
    table.index(['clientId']);
    table.index(['status']);
    table.index(['category']);
    table.index(['isRemote']);
    table.index(['budget']);
    table.index(['deadline']);
    table.index(['createdAt']);
    table.index(['assignedFreelancerId']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('jobs');
}; 