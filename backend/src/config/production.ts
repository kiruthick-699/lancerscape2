import { config as baseConfig } from './index';

// Production-specific configuration overrides
export const productionConfig = {
  ...baseConfig,
  
  // Enhanced security for production
  security: {
    ...baseConfig.security,
    bcryptRounds: 14, // Increased from 12 for production
    rateLimitMax: 50, // Reduced from 100 for production
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    passwordMinLength: 12,
    requireMFA: true,
  },
  
  // Enhanced monitoring for production
  monitoring: {
    ...baseConfig.monitoring,
    logLevel: 'warn', // Reduced logging in production
    enableMetrics: true,
    enableTracing: true,
    enableHealthChecks: true,
    enablePerformanceMonitoring: true,
    sentryDsn: process.env.SENTRY_DSN,
    newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    datadogApiKey: process.env.DATADOG_API_KEY,
  },
  
  // Enhanced database configuration for production
  database: {
    ...baseConfig.database,
    pool: {
      min: 5, // Increased minimum connections
      max: 50, // Increased maximum connections
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    ssl: true, // Require SSL in production
    sslOptions: {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY,
    },
  },
  
  // Enhanced Redis configuration for production
  redis: {
    ...baseConfig.redis,
    password: process.env.REDIS_PASSWORD, // Require password in production
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
  },
  
  // Enhanced JWT configuration for production
  jwt: {
    ...baseConfig.jwt,
    expiresIn: '10m', // Reduced from 15m for security
    refreshExpiresIn: '7d',
    issuer: 'lancerscape2-production',
    audience: 'lancerscape2-users-production',
  },
  
  // Enhanced CORS for production
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'https://lancerscape2.com',
    'https://www.lancerscape2.com',
    'https://app.lancerscape2.com'
  ],
  
  // Enhanced file upload limits for production
  upload: {
    ...baseConfig.upload,
    maxSize: 5 * 1024 * 1024, // Reduced to 5MB for production
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    scanForViruses: true,
    enableCompression: true,
  },
  
  // Enhanced payment configuration for production
  payment: {
    ...baseConfig.payment,
    stripe: {
      ...baseConfig.payment.stripe,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      enableWebhookVerification: true,
    },
    paypal: {
      ...baseConfig.payment.paypal,
      mode: 'live', // Production mode
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
    },
  },
  
  // Enhanced blockchain configuration for production
  blockchain: {
    ...baseConfig.blockchain,
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id',
    chainId: 1, // Ethereum mainnet
    gasLimit: 300000,
    gasPrice: 'auto',
    confirmations: 12, // Increased confirmations for production
    enableMonitoring: true,
  },
  
  // Enhanced email configuration for production
  email: {
    ...baseConfig.email,
    secure: true, // Require TLS in production
    requireTLS: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableQueue: true,
    enableBounceHandling: true,
  },
  
  // Enhanced SMS configuration for production
  sms: {
    ...baseConfig.sms,
    enableDeliveryReceipts: true,
    enableBounceHandling: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
  
  // Enhanced logging for production
  logging: {
    level: 'warn',
    format: 'json',
    enableRequestLogging: true,
    enableErrorLogging: true,
    enablePerformanceLogging: true,
    enableSecurityLogging: true,
    logToFile: true,
    logToConsole: false,
    logRotation: {
      maxSize: '100m',
      maxFiles: 14,
      compress: true,
    },
  },
  
  // Enhanced caching for production
  caching: {
    enableRedis: true,
    enableMemoryCache: true,
    defaultTTL: 300, // 5 minutes
    maxMemoryUsage: '512mb',
    enableCompression: true,
    enableStats: true,
  },
  
  // Enhanced rate limiting for production
  rateLimiting: {
    enableRedis: true,
    enableIPWhitelist: true,
    enableUserWhitelist: true,
    enableBurstProtection: true,
    enableGeolocationBlocking: true,
    blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || [],
  },
  
  // Enhanced security headers for production
  securityHeaders: {
    enableHSTS: true,
    enableCSP: true,
    enableXSSProtection: true,
    enableFrameOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    enableContentTypeOptions: true,
  },
  
  // Enhanced backup configuration for production
  backup: {
    enableAutomatedBackups: true,
    backupFrequency: 'daily',
    backupRetention: 30, // days
    backupCompression: true,
    backupEncryption: true,
    backupVerification: true,
  },
  
  // Enhanced disaster recovery for production
  disasterRecovery: {
    enableMultiRegion: true,
    enableFailover: true,
    enableBackupRestoration: true,
    enableDataReplication: true,
    recoveryTimeObjective: '4h',
    recoveryPointObjective: '1h',
  },
  
  // Enhanced performance monitoring for production
  performance: {
    enableProfiling: true,
    enableMetrics: true,
    enableTracing: true,
    enableLoadTesting: true,
    enableStressTesting: true,
    performanceThresholds: {
      maxResponseTime: 2000, // 2 seconds
      maxMemoryUsage: '1gb',
      maxCPUUsage: 80, // percentage
      maxDatabaseQueryTime: 1000, // 1 second
    },
  },
  
  // Enhanced alerting for production
  alerting: {
    enableAlerts: true,
    alertChannels: ['email', 'slack', 'pagerduty'],
    alertThresholds: {
      errorRate: 5, // percentage
      responseTime: 5000, // 5 seconds
      memoryUsage: '80%',
      cpuUsage: '90%',
      diskUsage: '85%',
    },
    enableEscalation: true,
    escalationDelay: 15 * 60 * 1000, // 15 minutes
  },
  
  // Enhanced compliance for production
  compliance: {
    enableGDPR: true,
    enableCCPA: true,
    enableSOC2: true,
    enableHIPAA: false, // Set based on requirements
    enablePCI: true,
    enableAuditLogging: true,
    enableDataRetention: true,
    dataRetentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
  },
};

// Environment validation for production
export const validateProductionEnvironment = () => {
  const required = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'DB_HOST',
    'DB_PASSWORD',
    'DB_SSL_CA',
    'REDIS_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'SENTRY_DSN',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'BLOCKCHAIN_PRIVATE_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters long in production');
  }
  
  // Validate session secret strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 64) {
    throw new Error('SESSION_SECRET must be at least 64 characters long in production');
  }
  
  // Validate database SSL
  if (process.env.DB_SSL !== 'true') {
    throw new Error('Database SSL is required in production');
  }
  
  // Validate Redis TLS
  if (process.env.REDIS_TLS !== 'true') {
    throw new Error('Redis TLS is required in production');
  }
  
  // Validate HTTPS
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'true') {
    throw new Error('HTTPS is required in production');
  }
};

// Export production config
export default productionConfig;
