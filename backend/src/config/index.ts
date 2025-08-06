import dotenv from 'dotenv';

dotenv.config();

interface Config {
  // Server
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  frontendUrl: string;
  
  // Database
  database: {
    host: string;
    port: number;
    name: string;
    username: string;
    password: string;
    ssl: boolean;
    pool: {
      min: number;
      max: number;
    };
  };
  
  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  // JWT
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  
  // Email
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
  
  // SMS (Twilio)
  sms: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  
  // File Upload
  upload: {
    maxSize: number;
    allowedTypes: string[];
    bucket: string;
    region: string;
  };
  
  // AWS
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3: {
      bucket: string;
      region: string;
    };
  };
  
  // Blockchain
  blockchain: {
    rpcUrl: string;
    chainId: number;
    jobPostingAddress: string;
    escrowAddress: string;
    reputationAddress: string;
    privateKey: string;
  };
  
  // Payment
  payment: {
    stripe: {
      secretKey: string;
      publishableKey: string;
      webhookSecret: string;
    };
    paypal: {
      clientId: string;
      clientSecret: string;
      mode: string;
    };
  };
  
  // Security
  security: {
    bcryptRounds: number;
    rateLimitWindow: number;
    rateLimitMax: number;
    sessionSecret: string;
  };
  
  // Monitoring
  monitoring: {
    sentryDsn?: string;
    logLevel: string;
  };
}

const config: Config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'lancerscape2',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Email
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@lancerscape2.com',
  },
  
  // SMS
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
  
  // File Upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
    allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    bucket: process.env.UPLOAD_BUCKET || 'lancerscape2-uploads',
    region: process.env.UPLOAD_REGION || 'us-east-1',
  },
  
  // AWS
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'lancerscape2-uploads',
      region: process.env.AWS_S3_REGION || 'us-east-1',
    },
  },
  
  // Blockchain
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.infura.io/v3/your-project-id',
    chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '11155111', 10), // Sepolia
    jobPostingAddress: process.env.JOB_POSTING_ADDRESS || '',
    escrowAddress: process.env.ESCROW_ADDRESS || '',
    reputationAddress: process.env.REPUTATION_ADDRESS || '',
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY || '',
  },
  
  // Payment
  payment: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      mode: process.env.PAYPAL_MODE || 'sandbox',
    },
  },
  
  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};

export { config }; 