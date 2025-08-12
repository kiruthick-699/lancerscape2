/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('username').unique().notNullable();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('password').notNullable();
    table.string('avatar');
    table.text('bio');
    table.string('phone');
    table.date('dateOfBirth');
    table.string('location');
    table.string('timezone');
    table.enum('userType', ['client', 'freelancer', 'admin']).defaultTo('client');
    table.boolean('isVerified').defaultTo(false);
    table.boolean('isActive').defaultTo(true);
    table.boolean('emailVerified').defaultTo(false);
    table.boolean('phoneVerified').defaultTo(false);
    table.string('walletAddress');
    table.string('blockchainAddress');
    table.integer('reputationScore').defaultTo(0);
    table.decimal('totalEarnings', 15, 2).defaultTo(0);
    table.integer('completedJobs').defaultTo(0);
    table.decimal('averageRating', 3, 2).defaultTo(0);
    table.integer('reviewCount').defaultTo(0);
    table.jsonb('skills').defaultTo('[]');
    table.jsonb('categories').defaultTo('[]');
    table.decimal('hourlyRate', 10, 2);
    table.enum('availability', ['available', 'busy', 'unavailable']).defaultTo('available');
    table.timestamp('lastActive').defaultTo(knex.fn.now());
    table.jsonb('preferences').defaultTo('{}');
    table.jsonb('settings').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.timestamp('deletedAt');

    // Indexes
    table.index(['email']);
    table.index(['username']);
    table.index(['userType']);
    table.index(['isActive']);
    table.index(['emailVerified']);
    table.index(['walletAddress']);
    table.index(['createdAt']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
}; 