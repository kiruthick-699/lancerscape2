import { Model, JSONSchema } from 'objection';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export interface UserAttributes {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  password: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  dateOfBirth?: Date;
  location?: string;
  timezone?: string;
  userType: 'client' | 'freelancer' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  walletAddress?: string;
  blockchainAddress?: string;
  reputationScore: number;
  totalEarnings: number;
  completedJobs: number;
  averageRating: number;
  reviewCount: number;
  skills: string[];
  categories: string[];
  hourlyRate?: number;
  availability: 'available' | 'busy' | 'unavailable';
  lastActive: Date;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      showEarnings: boolean;
      showLocation: boolean;
    };
    language: string;
    currency: string;
    timezone: string;
  };
  settings: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    loginNotifications: boolean;
    sessionTimeout: number;
  };
  metadata: {
    registrationSource: string;
    referralCode?: string;
    marketingConsent: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class User extends Model implements UserAttributes {
  id!: string;
  email!: string;
  username!: string;
  firstName!: string;
  lastName!: string;
  password!: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  dateOfBirth?: Date;
  location?: string;
  timezone?: string;
  userType!: 'client' | 'freelancer' | 'admin';
  isVerified!: boolean;
  isActive!: boolean;
  emailVerified!: boolean;
  phoneVerified!: boolean;
  walletAddress?: string;
  blockchainAddress?: string;
  reputationScore!: number;
  totalEarnings!: number;
  completedJobs!: number;
  averageRating!: number;
  reviewCount!: number;
  skills!: string[];
  categories!: string[];
  hourlyRate?: number;
  availability!: 'available' | 'busy' | 'unavailable';
  lastActive!: Date;
  preferences!: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      showEarnings: boolean;
      showLocation: boolean;
    };
    language: string;
    currency: string;
    timezone: string;
  };
  settings!: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    loginNotifications: boolean;
    sessionTimeout: number;
  };
  metadata!: {
    registrationSource: string;
    referralCode?: string;
    marketingConsent: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
  };
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;

  static tableName = 'users';

  static jsonSchema = {
    type: 'object',
    required: ['email', 'username', 'firstName', 'lastName', 'password', 'userType'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email', minLength: 1, maxLength: 255 },
      username: { type: 'string', minLength: 3, maxLength: 50 },
      firstName: { type: 'string', minLength: 1, maxLength: 100 },
      lastName: { type: 'string', minLength: 1, maxLength: 100 },
      password: { type: 'string', minLength: 8 },
      avatar: { type: 'string' },
      bio: { type: 'string', maxLength: 1000 },
      phone: { type: 'string' },
      dateOfBirth: { type: 'string', format: 'date' },
      location: { type: 'string', maxLength: 255 },
      timezone: { type: 'string' },
      userType: { type: 'string', enum: ['client', 'freelancer', 'admin'] },
      isVerified: { type: 'boolean' },
      isActive: { type: 'boolean' },
      emailVerified: { type: 'boolean' },
      phoneVerified: { type: 'boolean' },
      walletAddress: { type: 'string' },
      blockchainAddress: { type: 'string' },
      reputationScore: { type: 'number', minimum: 0 },
      totalEarnings: { type: 'number', minimum: 0 },
      completedJobs: { type: 'number', minimum: 0 },
      averageRating: { type: 'number', minimum: 0, maximum: 5 },
      reviewCount: { type: 'number', minimum: 0 },
      skills: { type: 'array', items: { type: 'string' } },
      categories: { type: 'array', items: { type: 'string' } },
      hourlyRate: { type: 'number', minimum: 0 },
      availability: { type: 'string', enum: ['available', 'busy', 'unavailable'] },
      lastActive: { type: 'string', format: 'date-time' },
      preferences: { type: 'object' },
      settings: { type: 'object' },
      metadata: { type: 'object' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      deletedAt: { type: 'string', format: 'date-time' }
    }
  };

  static get relationMappings() {
    const { Job } = require('./Job');
    const { Proposal } = require('./Proposal');
    const { Message } = require('./Message');
    const { Notification } = require('./Notification');
    const { Review } = require('./Review');

    return {
      jobs: {
        relation: Model.HasManyRelation,
        modelClass: Job,
        join: {
          from: 'users.id',
          to: 'jobs.clientId'
        }
      },
      proposals: {
        relation: Model.HasManyRelation,
        modelClass: Proposal,
        join: {
          from: 'users.id',
          to: 'proposals.freelancerId'
        }
      },
      sentMessages: {
        relation: Model.HasManyRelation,
        modelClass: Message,
        join: {
          from: 'users.id',
          to: 'messages.senderId'
        }
      },
      receivedMessages: {
        relation: Model.HasManyRelation,
        modelClass: Message,
        join: {
          from: 'users.id',
          to: 'messages.recipientId'
        }
      },
      notifications: {
        relation: Model.HasManyRelation,
        modelClass: Notification,
        join: {
          from: 'users.id',
          to: 'notifications.userId'
        }
      },
      reviews: {
        relation: Model.HasManyRelation,
        modelClass: Review,
        join: {
          from: 'users.id',
          to: 'reviews.reviewerId'
        }
      },
      receivedReviews: {
        relation: Model.HasManyRelation,
        modelClass: Review,
        join: {
          from: 'users.id',
          to: 'reviews.revieweeId'
        }
      }
    };
  }

  // Password hashing
  async $beforeInsert(context: any) {
    await super.$beforeInsert(context);
    
    if (this.password) {
      this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);
    }
    
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.lastActive = new Date();
    
    // Set defaults
    this.isVerified = false;
    this.isActive = true;
    this.emailVerified = false;
    this.phoneVerified = false;
    this.reputationScore = 0;
    this.totalEarnings = 0;
    this.completedJobs = 0;
    this.averageRating = 0;
    this.reviewCount = 0;
    this.skills = [];
    this.categories = [];
    this.availability = 'available';
    
    // Set default preferences
    this.preferences = {
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
    };
    
    // Set default settings
    this.settings = {
      twoFactorEnabled: false,
      loginNotifications: true,
      sessionTimeout: 24 * 60 * 60 * 1000 // 24 hours
    };
    
    // Set default metadata
    this.metadata = {
      registrationSource: 'web',
      marketingConsent: false,
      termsAccepted: false,
      privacyAccepted: false
    };
  }

  async $beforeUpdate(opt: any, context: any) {
    await super.$beforeUpdate(opt, context);
    
    if (this.password && this.password.length < 60) { // Not already hashed
      this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);
    }
    
    this.updatedAt = new Date();
  }

  // Password verification
  async verifyPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Update last active
  async updateLastActive(): Promise<void> {
    this.lastActive = new Date();
    await this.$query().patch({ lastActive: this.lastActive });
  }

  // Update reputation
  async updateReputation(score: number, earnings: number, rating: number): Promise<void> {
    this.reputationScore = score;
    this.totalEarnings = earnings;
    this.averageRating = rating;
    this.reviewCount += 1;
    await this.$query().patch({
      reputationScore: this.reputationScore,
      totalEarnings: this.totalEarnings,
      averageRating: this.averageRating,
      reviewCount: this.reviewCount
    });
  }

  // Get full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Get display name
  get displayName(): string {
    return this.username || this.fullName;
  }

  // Check if user is online
  get isOnline(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.lastActive > fiveMinutesAgo;
  }

  // Get public profile (without sensitive data)
  get publicProfile() {
    return {
      id: this.id,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      bio: this.bio,
      location: this.preferences.privacy.showLocation ? this.location : undefined,
      userType: this.userType,
      isVerified: this.isVerified,
      reputationScore: this.reputationScore,
      totalEarnings: this.preferences.privacy.showEarnings ? this.totalEarnings : undefined,
      completedJobs: this.completedJobs,
      averageRating: this.averageRating,
      reviewCount: this.reviewCount,
      skills: this.skills,
      categories: this.categories,
      hourlyRate: this.hourlyRate,
      availability: this.availability,
      isOnline: this.isOnline,
      createdAt: this.createdAt
    };
  }
} 