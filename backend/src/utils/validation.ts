import Joi from 'joi';
import { ValidationError } from '../middleware/errorHandler';

// Common validation patterns
const commonPatterns = {
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  name: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s'-]+$/).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).max(20).optional(),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  url: Joi.string().uri().max(500).optional(),
  uuid: Joi.string().uuid().required(),
  positiveNumber: Joi.number().positive().required(),
  nonNegativeNumber: Joi.number().min(0).required(),
  date: Joi.date().iso().min('now').required(),
  pastDate: Joi.date().iso().max('now').required(),
  category: Joi.number().integer().min(0).max(4).required(),
  status: Joi.string().valid('posted', 'accepted', 'in_progress', 'submitted', 'approved', 'paid').required(),
  userType: Joi.string().valid('client', 'freelancer', 'admin').required(),
  boolean: Joi.boolean().required(),
  text: Joi.string().min(1).max(1000).required(),
  longText: Joi.string().min(1).max(5000).required(),
  shortText: Joi.string().min(1).max(100).required(),
};

// User validation schemas
export const userValidation = {
  register: Joi.object({
    email: commonPatterns.email,
    username: commonPatterns.username,
    firstName: commonPatterns.name,
    lastName: commonPatterns.name,
    password: commonPatterns.password,
    userType: commonPatterns.userType,
    phone: commonPatterns.phone,
    walletAddress: commonPatterns.walletAddress,
    metadata: Joi.object({
      registrationSource: Joi.string().max(50).optional(),
      marketingConsent: commonPatterns.boolean,
      termsAccepted: commonPatterns.boolean,
      privacyAccepted: commonPatterns.boolean,
    }).optional(),
  }),

  login: Joi.object({
    email: commonPatterns.email,
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: commonPatterns.name.optional(),
    lastName: commonPatterns.name.optional(),
    bio: Joi.string().max(500).optional(),
    phone: commonPatterns.phone,
    location: Joi.string().max(100).optional(),
    avatar: commonPatterns.url,
    skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    hourlyRate: commonPatterns.nonNegativeNumber.optional(),
    availability: Joi.string().valid('available', 'busy', 'unavailable').optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonPatterns.password,
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: commonPatterns.password,
  }),

  forgotPassword: Joi.object({
    email: commonPatterns.email,
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required(),
  }),

  resendVerification: Joi.object({
    email: commonPatterns.email,
  }),
};

// Job validation schemas
export const jobValidation = {
  create: Joi.object({
    title: commonPatterns.shortText,
    description: commonPatterns.longText,
    budget: commonPatterns.positiveNumber,
    deadline: commonPatterns.date,
    category: commonPatterns.category,
    isRemote: commonPatterns.boolean,
    location: Joi.string().max(100).optional(),
    skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    requirements: Joi.array().items(Joi.string().max(200)).max(10).optional(),
    attachments: Joi.array().items(commonPatterns.url).max(5).optional(),
  }),

  update: Joi.object({
    title: commonPatterns.shortText.optional(),
    description: commonPatterns.longText.optional(),
    budget: commonPatterns.positiveNumber.optional(),
    deadline: commonPatterns.date.optional(),
    category: commonPatterns.category.optional(),
    isRemote: commonPatterns.boolean.optional(),
    location: Joi.string().max(100).optional(),
    skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    requirements: Joi.array().items(Joi.string().max(200)).max(10).optional(),
    status: commonPatterns.status.optional(),
  }),

  search: Joi.object({
    query: Joi.string().max(100).optional(),
    category: Joi.alternatives().try(commonPatterns.category, Joi.string().max(50)).optional(),
    budgetMin: commonPatterns.nonNegativeNumber.optional(),
    budgetMax: commonPatterns.nonNegativeNumber.optional(),
    location: Joi.string().max(100).optional(),
    isRemote: commonPatterns.boolean.optional(),
    skills: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    status: commonPatterns.status.optional(),
    page: Joi.number().integer().min(1).max(1000).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().valid('createdAt', 'budget', 'deadline', 'proposals').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),
};

// Proposal validation schemas
export const proposalValidation = {
  create: Joi.object({
    jobId: commonPatterns.uuid,
    proposedAmount: commonPatterns.positiveNumber,
    coverLetter: commonPatterns.longText,
    deliveryTime: Joi.string().max(100).required(),
    attachments: Joi.array().items(commonPatterns.url).max(5).optional(),
    portfolio: Joi.array().items(commonPatterns.url).max(10).optional(),
  }),

  update: Joi.object({
    proposedAmount: commonPatterns.positiveNumber.optional(),
    coverLetter: commonPatterns.longText.optional(),
    deliveryTime: Joi.string().max(100).optional(),
    attachments: Joi.array().items(commonPatterns.url).max(5).optional(),
    portfolio: Joi.array().items(commonPatterns.url).max(10).optional(),
  }),

  status: Joi.object({
    status: Joi.string().valid('pending', 'accepted', 'rejected', 'withdrawn').required(),
    reason: Joi.string().max(500).optional(),
  }),
};

// Payment validation schemas
export const paymentValidation = {
  createEscrow: Joi.object({
    jobId: commonPatterns.uuid,
    amount: commonPatterns.positiveNumber,
    deadline: commonPatterns.date,
    terms: commonPatterns.longText.optional(),
  }),

  releasePayment: Joi.object({
    escrowId: commonPatterns.uuid,
    amount: commonPatterns.positiveNumber,
    reason: Joi.string().max(500).optional(),
  }),

  raiseDispute: Joi.object({
    escrowId: commonPatterns.uuid,
    reason: commonPatterns.longText,
    evidence: Joi.array().items(commonPatterns.url).max(5).optional(),
  }),

  stripeWebhook: Joi.object({
    id: Joi.string().required(),
    type: Joi.string().required(),
    data: Joi.object().required(),
    created: Joi.number().required(),
  }),
};

// Message validation schemas
export const messageValidation = {
  send: Joi.object({
    jobId: commonPatterns.uuid,
    text: commonPatterns.text,
    attachments: Joi.array().items(commonPatterns.url).max(5).optional(),
    replyTo: commonPatterns.uuid.optional(),
  }),

  update: Joi.object({
    text: commonPatterns.text,
    attachments: Joi.array().items(commonPatterns.url).max(5).optional(),
  }),
};

// Notification validation schemas
export const notificationValidation = {
  preferences: Joi.object({
    email: commonPatterns.boolean,
    push: commonPatterns.boolean,
    sms: commonPatterns.boolean,
    inApp: commonPatterns.boolean,
    frequency: Joi.string().valid('immediate', 'hourly', 'daily', 'weekly').required(),
  }),

  markRead: Joi.object({
    notificationIds: Joi.array().items(commonPatterns.uuid).min(1).max(100).required(),
  }),
};

// Blockchain validation schemas
export const blockchainValidation = {
  walletConnect: Joi.object({
    address: commonPatterns.walletAddress,
    signature: Joi.string().required(),
    message: Joi.string().required(),
    timestamp: Joi.number().required(),
  }),

  contractInteraction: Joi.object({
    contractAddress: commonPatterns.walletAddress,
    functionName: Joi.string().max(100).required(),
    parameters: Joi.array().items(Joi.any()).max(20).optional(),
    value: commonPatterns.nonNegativeNumber.optional(),
  }),
};

// Admin validation schemas
export const adminValidation = {
  userManagement: Joi.object({
    userId: commonPatterns.uuid,
    action: Joi.string().valid('suspend', 'activate', 'delete', 'verify').required(),
    reason: Joi.string().max(500).optional(),
    duration: Joi.number().integer().min(1).max(365).optional(), // days
  }),

  systemSettings: Joi.object({
    key: Joi.string().max(100).required(),
    value: Joi.any().required(),
    description: Joi.string().max(500).optional(),
  }),

  analytics: Joi.object({
    startDate: commonPatterns.pastDate,
    endDate: commonPatterns.pastDate,
    metrics: Joi.array().items(Joi.string().valid('users', 'jobs', 'payments', 'revenue')).min(1).required(),
    groupBy: Joi.string().valid('day', 'week', 'month', 'year').optional(),
  }),
};

// File upload validation schemas
export const fileValidation = {
  upload: Joi.object({
    file: Joi.object({
      fieldname: Joi.string().required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().required(),
      mimetype: Joi.string().required(),
      size: Joi.number().max(10 * 1024 * 1024).required(), // 10MB max
    }).required(),
    type: Joi.string().valid('avatar', 'portfolio', 'attachment', 'document').required(),
    jobId: commonPatterns.uuid.optional(),
  }),
};

// Generic validation function
export function validate<T>(schema: Joi.ObjectSchema, data: any): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const validationError = new ValidationError('Validation failed');
    validationError.details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type,
    }));
    throw validationError;
  }

  return value;
}

// Async validation function for complex validations
export async function validateAsync<T>(schema: Joi.ObjectSchema, data: any): Promise<T> {
  try {
    return await schema.validateAsync(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
  } catch (error) {
    if (error instanceof Joi.ValidationError) {
      const validationError = new ValidationError('Validation failed');
      validationError.details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));
      throw validationError;
    }
    throw error;
  }
}

// Sanitization functions
export const sanitize = {
  html: (input: string): string => {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },

  sql: (input: string): string => {
    // Basic SQL injection prevention - in production, use parameterized queries
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },

  xss: (input: string): string => {
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },
};

// Export all schemas
export const schemas = {
  user: userValidation,
  job: jobValidation,
  proposal: proposalValidation,
  payment: paymentValidation,
  message: messageValidation,
  notification: notificationValidation,
  blockchain: blockchainValidation,
  admin: adminValidation,
  file: fileValidation,
};
