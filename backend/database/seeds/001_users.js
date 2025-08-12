const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();

  // Inserts seed entries
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const users = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'admin@lancerscape2.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      userType: 'admin',
      isVerified: true,
      isActive: true,
      emailVerified: true,
      reputationScore: 100,
      totalEarnings: 0,
      completedJobs: 0,
      averageRating: 5.0,
      reviewCount: 0,
      skills: JSON.stringify(['management', 'administration']),
      categories: JSON.stringify(['admin']),
      availability: 'available',
      preferences: JSON.stringify({
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          profileVisibility: 'public',
          showEarnings: true,
          showLocation: true
        },
        language: 'en',
        currency: 'USD',
        timezone: 'UTC'
      }),
      settings: JSON.stringify({
        twoFactorEnabled: false,
        loginNotifications: true,
        sessionTimeout: 3600
      }),
      metadata: JSON.stringify({
        registrationSource: 'seed',
        marketingConsent: true,
        termsAccepted: true,
        privacyAccepted: true
      })
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'client@lancerscape2.com',
      username: 'testclient',
      firstName: 'Test',
      lastName: 'Client',
      password: hashedPassword,
      userType: 'client',
      isVerified: true,
      isActive: true,
      emailVerified: true,
      reputationScore: 50,
      totalEarnings: 0,
      completedJobs: 0,
      averageRating: 4.5,
      reviewCount: 0,
      skills: JSON.stringify(['project management']),
      categories: JSON.stringify(['client']),
      availability: 'available',
      preferences: JSON.stringify({
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          profileVisibility: 'public',
          showEarnings: false,
          showLocation: true
        },
        language: 'en',
        currency: 'USD',
        timezone: 'UTC'
      }),
      settings: JSON.stringify({
        twoFactorEnabled: false,
        loginNotifications: true,
        sessionTimeout: 3600
      }),
      metadata: JSON.stringify({
        registrationSource: 'seed',
        marketingConsent: true,
        termsAccepted: true,
        privacyAccepted: true
      })
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      email: 'freelancer@lancerscape2.com',
      username: 'testfreelancer',
      firstName: 'Test',
      lastName: 'Freelancer',
      password: hashedPassword,
      userType: 'freelancer',
      isVerified: true,
      isActive: true,
      emailVerified: true,
      reputationScore: 75,
      totalEarnings: 5000,
      completedJobs: 10,
      averageRating: 4.8,
      reviewCount: 10,
      skills: JSON.stringify(['react', 'node.js', 'typescript']),
      categories: JSON.stringify(['development']),
      hourlyRate: 50,
      availability: 'available',
      preferences: JSON.stringify({
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        privacy: {
          profileVisibility: 'public',
          showEarnings: true,
          showLocation: true
        },
        language: 'en',
        currency: 'USD',
        timezone: 'UTC'
      }),
      settings: JSON.stringify({
        twoFactorEnabled: false,
        loginNotifications: true,
        sessionTimeout: 3600
      }),
      metadata: JSON.stringify({
        registrationSource: 'seed',
        marketingConsent: true,
        termsAccepted: true,
        privacyAccepted: true
      })
    }
  ];

  await knex('users').insert(users);
}; 