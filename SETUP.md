# 🚀 Lancerscape2 Setup Guide

This guide will help you set up the complete Lancerscape2 freelancing platform with blockchain integration.

## 📋 Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL
- Redis
- MetaMask browser extension
- Infura account (for blockchain RPC)

## 🏗️ Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd lancerscape2

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install blockchain dependencies
cd ..
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### 2. Environment Configuration

```bash
# Copy environment example
cp env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables:**
- `EXPO_PUBLIC_RPC_URL`: Your Infura RPC URL
- `EXPO_PUBLIC_CHAIN_ID`: Network chain ID (11155111 for Sepolia)
- Contract addresses (after deployment)

### 3. Database Setup

```bash
# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Linux

# Create database
createdb lancerscape2

# Run migrations (from backend directory)
cd backend
npm run migrate
```

### 4. Redis Setup

```bash
# Start Redis
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

### 5. Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to testnet
npx hardhat run scripts/deploy.js --network sepolia

# Copy contract addresses to .env
```

### 6. Start the Application

```bash
# Start backend (from backend directory)
cd backend
npm run dev

# Start frontend (from root directory)
cd ..
npm run dev
```

## 🔧 MetaMask Wallet Integration

### ✅ What's Implemented:

1. **Wallet Context Provider** (`contexts/WalletContext.tsx`)
   - Manages wallet connection state
   - Handles MetaMask connection
   - Error handling and loading states

2. **Wallet Connect Button** (`components/WalletConnectButton.tsx`)
   - Connect/disconnect functionality
   - Loading states and error handling
   - Multiple styling variants

3. **Web3 Service** (`services/web3Service.ts`)
   - ethers.js v6 integration
   - Contract interaction methods
   - MetaMask provider support

4. **UI Integration**
   - TopNavBar shows wallet status
   - Dashboard shows connection notice
   - Buttons disabled when wallet not connected

### 🎯 How to Use:

1. **Connect Wallet:**
   - Click "Connect Wallet" button in top navigation
   - Approve MetaMask connection
   - Wallet address will be displayed

2. **Blockchain Features:**
   - Post jobs (requires wallet connection)
   - Submit proposals
   - Release payments
   - Earn reputation badges

## 🏗️ Architecture Overview

### Frontend (React Native + Expo)
```
app/
├── (tabs)/           # Main app screens
├── _layout.tsx       # Root layout with providers
contexts/
├── ThemeContext.tsx  # Dark/light theme
├── WalletContext.tsx # Wallet state management
components/
├── TopNavBar.tsx     # Navigation with wallet
├── WalletConnectButton.tsx # Wallet connection
services/
├── web3Service.ts    # Blockchain interactions
```

### Backend (Node.js + Express)
```
backend/src/
├── config/           # Configuration
├── database/         # Database connection
├── middleware/       # Express middleware
├── models/           # Database models
├── routes/           # API routes
├── services/         # Business logic
└── utils/            # Utilities
```

### Smart Contracts (Solidity)
```
contracts/
├── JobPosting.sol    # Job management
├── Escrow.sol        # Payment system
└── Reputation.sol    # NFT badges
```

## 🔗 Key Features

### ✅ Implemented:
- ✅ MetaMask wallet integration
- ✅ Smart contract deployment
- ✅ Frontend wallet UI
- ✅ Backend API infrastructure
- ✅ Database models and migrations
- ✅ Authentication system
- ✅ Real-time notifications
- ✅ Theme system (dark/light)

### 🚧 In Progress:
- 🔄 Job posting UI
- 🔄 Proposal submission
- 🔄 Payment processing
- 🔄 Reputation system

### 📋 Planned:
- 📝 Advanced search and filtering
- 📝 Dispute resolution system
- 📝 Multi-chain support
- 📝 Mobile app deployment
- 📝 Analytics dashboard

## 🧪 Testing

```bash
# Test smart contracts
npx hardhat test

# Test backend API
cd backend
npm test

# Test frontend components
npm run test
```

## 🚀 Deployment

### Frontend (Expo)
```bash
# Build for web
npm run build:web

# Build for mobile
expo build:android
expo build:ios
```

### Backend
```bash
# Production build
cd backend
npm run build
npm start
```

### Smart Contracts
```bash
# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Verify contracts
npx hardhat verify --network mainnet CONTRACT_ADDRESS
```

## 🆘 Troubleshooting

### Common Issues:

1. **MetaMask not connecting:**
   - Ensure MetaMask is installed
   - Check if you're on the correct network
   - Clear browser cache

2. **Contract deployment fails:**
   - Check your private key in .env
   - Ensure sufficient testnet ETH
   - Verify network configuration

3. **Database connection errors:**
   - Check PostgreSQL is running
   - Verify database credentials
   - Run migrations

4. **Frontend build errors:**
   - Clear node_modules and reinstall
   - Check TypeScript configuration
   - Verify all dependencies

## 📞 Support

For issues and questions:
- Check the troubleshooting section
- Review the blockchain documentation
- Open an issue on GitHub

---

**🎉 Congratulations!** Your Lancerscape2 platform is now ready for development and testing. 