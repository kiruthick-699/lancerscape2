import { config as baseConfig } from './index';

export const productionConfig = {
  ...baseConfig,
  
  security: {
    ...baseConfig.security,
    bcryptRounds: 14,
    rateLimitMax: 50,
    rateLimitWindow: 15 * 60 * 1000,
    sessionTimeout: 30 * 60 * 1000,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000,
    passwordMinLength: 12,
    requireMFA: true,
  },
  
  monitoring: {
    ...baseConfig.monitoring,
    logLevel: 'warn',
    enableMetrics: true,
    enableTracing: true,
    enableHealthChecks: true,
    enablePerformanceMonitoring: true,
    sentryDsn: process.env.SENTRY_DSN,
    newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    datadogApiKey: process.env.DATADOG_API_KEY,
  },
  
  database: {
    ...baseConfig.database,
    pool: {
      min: 5,
      max: 50,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    ssl: true,
    sslOptions: {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY,
    },
  },
  
  redis: {
    ...baseConfig.redis,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    maxLoadingTimeout: 10000,
  },
  
  jwt: {
    ...baseConfig.jwt,
    expiresIn: '10m',
    refreshExpiresIn: '7d',
    issuer: 'lancerscape2-production',
    audience: 'lancerscape2-users-production',
  },
  
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'https://lancerscape2.com',
    'https://www.lancerscape2.com',
    'https://app.lancerscape2.com'
  ],
  
  upload: {
    ...baseConfig.upload,
    maxSize: 5 * 1024 * 1024,
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
  
  payment: {
    ...baseConfig.payment,
    stripe: {
      ...baseConfig.payment.stripe,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      enableWebhookVerification: true,
    },
    paypal: {
      ...baseConfig.payment.paypal,
      mode: 'live',
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
    },
  },
  
  blockchain: {
    ...baseConfig.blockchain,
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id',
    chainId: 1,
    gasLimit: 300000,
    gasPrice: 'auto',
    confirmations: 12,
    enableMonitoring: true,
  },
  
  email: {
    ...baseConfig.email,
    secure: true,
    requireTLS: true,
    maxRetries: 3,
    retryDelay: 1000,
    enableQueue: true,
    enableBounceHandling: true,
  },
  
  sms: {
    ...baseConfig.sms,
    enableDeliveryReceipts: true,
    enableBounceHandling: true,
    maxRetries: 3,
    retryDelay: 1000,
  },
  
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
  
  caching: {
    enableRedis: true,
    enableMemoryCache: true,
    defaultTTL: 300,
    maxMemoryUsage: '512mb',
    enableCompression: true,
    enableStats: true,
  },
  
  rateLimiting: {
    enableRedis: true,
    enableIPWhitelist: true,
    enableUserWhitelist: true,
    enableBurstProtection: true,
    enableGeolocationBlocking: true,
    blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || [],
  },
  
  securityHeaders: {
    enableHSTS: true,
    enableCSP: true,
    enableXSSProtection: true,
    enableFrameOptions: true,
    enableReferrerPolicy: true,
    enablePermissionsPolicy: true,
    enableContentTypeOptions: true,
  },
  
  backup: {
    enableAutomatedBackups: true,
    backupFrequency: 'daily',
    backupRetention: 30,
    backupCompression: true,
    backupEncryption: true,
    backupVerification: true,
  },
  
  disasterRecovery: {
    enableMultiRegion: true,
    enableFailover: true,
    enableBackupRestoration: true,
    enableDataReplication: true,
    recoveryTimeObjective: '4h',
    recoveryPointObjective: '1h',
  },
  
  performance: {
    enableProfiling: true,
    enableMetrics: true,
    enableTracing: true,
    enableLoadTesting: true,
    enableStressTesting: true,
    performanceThresholds: {
      maxResponseTime: 2000,
      maxMemoryUsage: '1gb',
      maxCPUUsage: 80,
      maxDatabaseQueryTime: 1000,
    },
  },
  
  alerting: {
    enableAlerts: true,
    alertChannels: ['email', 'slack', 'pagerduty'],
    alertThresholds: {
      errorRate: 5,
      responseTime: 5000,
      memoryUsage: '80%',
      cpuUsage: '90%',
      diskUsage: '85%',
    },
    enableEscalation: true,
    escalationDelay: 15 * 60 * 1000,
  },
  
  compliance: {
    enableGDPR: true,
    enableCCPA: true,
    enableSOC2: true,
    enableHIPAA: false,
    enablePCI: true,
    enableAuditLogging: true,
    enableDataRetention: true,
    dataRetentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000,
  },
};

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
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters long');
  }
  
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 64) {
    throw new Error('SESSION_SECRET must be at least 64 characters long');
  }
  
  if (process.env.DB_SSL !== 'true') {
    throw new Error('Database SSL is required in production');
  }
  
  if (process.env.REDIS_TLS !== 'true') {
    throw new Error('Redis TLS is required in production');
  }
  
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'true') {
    throw new Error('HTTPS is required in production');
  }
};

export default productionConfig;
