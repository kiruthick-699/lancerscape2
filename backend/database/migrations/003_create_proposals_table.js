/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('proposals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('jobId').references('id').inTable('jobs').onDelete('CASCADE');
    table.uuid('freelancerId').references('id').inTable('users').onDelete('CASCADE');
    table.decimal('proposedAmount', 15, 2).notNullable();
    table.text('coverLetter').notNullable();
    table.integer('deliveryTime').notNullable(); // in days
    table.enum('status', ['pending', 'accepted', 'rejected', 'withdrawn']).defaultTo('pending');
    table.text('rejectionReason');
    table.timestamp('acceptedAt');
    table.timestamp('rejectedAt');
    table.jsonb('attachments').defaultTo('[]');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // Indexes
    table.index(['jobId']);
    table.index(['freelancerId']);
    table.index(['status']);
    table.index(['proposedAmount']);
    table.index(['createdAt']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('proposals');
}; 