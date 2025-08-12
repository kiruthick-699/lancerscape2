# 🚀 Lancerscape2 Complete Setup Guide

This guide will walk you through setting up the complete Lancerscape2 application, including the backend, frontend, database, and blockchain integration.

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v13 or higher)
- **Redis** (v6 or higher)
- **Docker** (optional, for containerized setup)
- **Git**

## 🏗️ Architecture Overview

```
lancerscape2/
├── app/                    # React Native frontend
├── backend/               # Node.js backend API
├── contracts/             # Ethereum smart contracts
├── components/            # Shared React components
├── services/              # Frontend services
└── docs/                  # Documentation
```

## 🚀 Quick Start (Docker)

The fastest way to get started is using Docker:

### 1. Clone the Repository

```bash
git clone <repository-url>
cd lancerscape2
```

### 2. Start Services with Docker

```bash
# Start PostgreSQL and Redis
cd backend
docker-compose up -d postgres redis

# Wait for services to be ready (about 30 seconds)
sleep 30
```

### 3. Setup Backend

```bash
# Install dependencies
cd backend
npm install

# Copy environment file
cp env.example .env

# Update .env with your configuration
# (See Environment Variables section below)

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 4. Start Backend

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 5. Setup Frontend

```bash
# Install dependencies
cd ..
npm install

# Copy environment file
cp env.example .env

# Update .env with your configuration

# Start the app
npm start
```

## 🔧 Manual Setup

### Backend Setup

#### 1. Database Setup

**PostgreSQL Installation:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

**Create Database:**

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE lancerscape2;
CREATE USER lancerscape2_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE lancerscape2 TO lancerscape2_user;
\q
```

#### 2. Redis Setup

**Redis Installation:**

```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis

# Windows
# Download from https://redis.io/download
```

#### 3. Backend Configuration

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lancerscape2
DB_USERNAME=lancerscape2_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Blockchain (Sepolia Testnet)
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
BLOCKCHAIN_CHAIN_ID=11155111
```

#### 4. Run Migrations and Seeds

```bash
# Run database migrations
npm run migrate

# Run database seeds (development only)
npm run seed
```

#### 5. Start Backend

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Frontend Setup

#### 1. Install Dependencies

```bash
cd ..
npm install
```

#### 2. Environment Configuration

```bash
# Copy environment file
cp env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**

```env
# Backend API
EXPO_PUBLIC_API_URL=http://localhost:3000

# Blockchain
EXPO_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_JOB_POSTING_ADDRESS=0x...
EXPO_PUBLIC_ESCROW_ADDRESS=0x...
EXPO_PUBLIC_REPUTATION_ADDRESS=0x...
```

#### 3. Start Frontend

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## 🔗 Blockchain Integration

### 1. Smart Contract Deployment

#### Prerequisites

- **Hardhat** installed globally: `npm install -g hardhat`
- **MetaMask** wallet with Sepolia testnet configured
- **Sepolia ETH** for gas fees

#### Deployment Steps

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia
```

#### Update Environment Variables

After deployment, update the contract addresses in your `.env` files:

```env
# Backend .env
JOB_POSTING_ADDRESS=0x... # Deployed contract address
ESCROW_ADDRESS=0x...      # Deployed contract address
REPUTATION_ADDRESS=0x...  # Deployed contract address

# Frontend .env
EXPO_PUBLIC_JOB_POSTING_ADDRESS=0x...
EXPO_PUBLIC_ESCROW_ADDRESS=0x...
EXPO_PUBLIC_REPUTATION_ADDRESS=0x...
```

### 2. Infura Setup

1. Go to [Infura](https://infura.io/) and create an account
2. Create a new project
3. Copy the project ID
4. Update your `.env` files:

```env
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
EXPO_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

## 📧 Email Service Setup

### Gmail SMTP Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
3. Update your `.env` file:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@lancerscape2.com
```

## 🔐 Security Configuration

### JWT Configuration

Generate a secure JWT secret:

```bash
# Generate a random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Update your `.env` file:

```env
JWT_SECRET=your-generated-secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### Rate Limiting

Configure rate limiting in your `.env`:

```env
RATE_LIMIT_WINDOW=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX=100        # Maximum requests per window
```

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Frontend Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Production Deployment

### Backend Deployment

1. **Environment Setup:**
   ```bash
   NODE_ENV=production
   ```

2. **Database Setup:**
   - Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
   - Configure SSL connections
   - Set up automated backups

3. **Redis Setup:**
   - Use a managed Redis service (AWS ElastiCache, Google Cloud Memorystore, etc.)

4. **Process Management:**
   ```bash
   # Install PM2
   npm install -g pm2

   # Start the application
   pm2 start ecosystem.config.js

   # Save PM2 configuration
   pm2 save

   # Setup PM2 to start on boot
   pm2 startup
   ```

5. **Reverse Proxy:**
   - Configure Nginx for SSL termination
   - Set up load balancing if needed

### Frontend Deployment

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy to Expo:**
   ```bash
   # Install EAS CLI
   npm install -g @expo/eas-cli

   # Login to Expo
   eas login

   # Configure EAS
   eas build:configure

   # Build for production
   eas build --platform all
   ```

## 📊 Monitoring and Logging

### Backend Monitoring

1. **Application Logs:**
   - Logs are stored in `backend/logs/`
   - Use Winston for structured logging

2. **Health Checks:**
   - Health endpoint: `GET /health`
   - Database health: `GET /health/db`
   - Redis health: `GET /health/redis`

3. **Performance Monitoring:**
   - Consider using Sentry for error tracking
   - Use PM2 for process monitoring

### Frontend Monitoring

1. **Error Tracking:**
   - Configure Sentry for React Native
   - Monitor app crashes and errors

2. **Analytics:**
   - Consider using Firebase Analytics
   - Track user engagement and app usage

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Issues:**
   - Check if PostgreSQL is running
   - Verify connection credentials
   - Ensure database exists

2. **Redis Connection Issues:**
   - Check if Redis is running
   - Verify Redis configuration

3. **Blockchain Connection Issues:**
   - Verify Infura project ID
   - Check network configuration
   - Ensure contract addresses are correct

4. **Email Issues:**
   - Verify Gmail app password
   - Check SMTP configuration
   - Ensure 2FA is enabled

### Getting Help

1. Check the logs in `backend/logs/`
2. Review the documentation in `docs/`
3. Check the GitHub issues
4. Contact the development team

## 📚 Additional Resources

- [Backend API Documentation](http://localhost:3000/api-docs)
- [Frontend Documentation](./docs/frontend.md)
- [Blockchain Documentation](./docs/blockchain.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 