# Lancerscape2 - Blockchain-Powered Job Marketplace

A full-stack, decentralized job marketplace built with React Native, Node.js, and Ethereum smart contracts.

#Features

# Authentication & Security
- **Complete Authentication System** - Login, registration, email verification
- **Two-Factor Authentication** - Enhanced security with 2FA support
- **JWT Token Management** - Secure session handling with refresh tokens
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Comprehensive client and server-side validation

# Job Management
- **Job Posting** - Create and manage job listings
- **Proposal System** - Submit and manage job proposals
- **Escrow Payments** - Secure payment escrow with dispute resolution
- **Reputation System** - User reputation and NFT badges
- **Real-time Chat** - Built-in messaging system

# Blockchain Integration
- **MetaMask Integration** - Seamless wallet connection
- **Smart Contracts** - JobPosting, Escrow, and Reputation contracts
- **Web3 Service** - Complete blockchain interaction layer
- **Transaction Management** - Secure blockchain transactions

# Modern UI/UX
- **React Native with Expo** - Cross-platform mobile app
- **Dark/Light Themes** - Customizable theme system
- **Responsive Design** - Beautiful, modern interface
- **Real-time Updates** - Live data synchronization

# Architecture

```
lancerscape2/
├── app/                    # React Native screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── login.tsx          # Authentication screens
│   └── register.tsx
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── models/        # Database models
│   │   └── middleware/    # Express middleware
├── contracts/             # Ethereum smart contracts
│   ├── JobPosting.sol     # Job management contract
│   ├── Escrow.sol         # Payment escrow contract
│   └── Reputation.sol     # Reputation system contract
├── components/            # Reusable React components
├── contexts/              # React contexts
├── services/              # Frontend services
└── types/                 # TypeScript type definitions
```

# Quick Start

# Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- MetaMask wallet
- PostgreSQL database
- Redis server

# Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd lancerscape2
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment setup**
   ```bash
   # Copy environment example
   cp env.example .env
   
   # Edit .env with your configuration
   # See SETUP.md for detailed instructions
   ```

4. **Database setup**
   ```bash
   # Start PostgreSQL and Redis
   # Configure database connection in backend/src/config/index.ts
   ```

5. **Start the application**
   ```bash
   # Start backend
   cd backend
   npm run dev
   
   # Start frontend (in new terminal)
   npx expo start
   ```

# Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Smart contract deployment
- **[SECURITY.md](SECURITY.md)** - Security implementation details
- **[README-BLOCKCHAIN.md](README-BLOCKCHAIN.md)** - Blockchain features

# Security Features

# Smart Contract Security
- ✅ Reentrancy protection
- ✅ Access controls and authorization
- ✅ Input validation and sanitization
- ✅ Rate limiting and cooldowns
- ✅ Emergency pause functionality
- ✅ Timelock mechanisms
- ✅ Dispute resolution system

# Application Security
- ✅ JWT token management
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting and throttling
- ✅ Input validation and sanitization
- ✅ CORS protection
- ✅ XSS and SQL injection prevention
- ✅ Secure environment configuration

# Tech Stack

# Frontend
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **TypeScript** - Type-safe JavaScript
- **Ethers.js** - Ethereum blockchain interaction
- **React Context** - State management

# Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **Objection.js** - SQL query builder
- **JWT** - Authentication tokens

# Blockchain
- **Solidity** - Smart contract language
- **Hardhat** - Development framework
- **OpenZeppelin** - Secure contract libraries
- **Ethereum** - Blockchain platform

# DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD (ready to configure)
- **Environment Variables** - Secure configuration

# Key Features

# For Job Seekers
- Browse and search job listings
- Submit proposals with cover letters
- Track application status
- Receive payments through escrow
- Build reputation and earn badges

# For Job Posters
- Post detailed job listings
- Review and accept proposals
- Manage project timelines
- Release payments securely
- Rate freelancers

# For Platform
- Secure payment processing
- Dispute resolution system
- Reputation management
- Real-time notifications
- Analytics and reporting

# Development Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/your-feature-name
   # Make changes
   git add .
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

2. **Testing**
   ```bash
   # Frontend tests
   npm test
   
   # Backend tests
   cd backend
   npm test
   ```

3. **Smart Contract Testing**
   ```bash
   npx hardhat test
   npx hardhat coverage
   ```

## 📊 Project Status

- ✅ **Core Features** - 100% Complete
- ✅ **Authentication** - 100% Complete
- ✅ **Smart Contracts** - 100% Complete
- ✅ **UI/UX** - 90% Complete
- ✅ **Security** - 100% Complete
- ✅ **Documentation** - 100% Complete

# Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

# Support

For support and questions:
- Check the [documentation](SETUP.md)
- Review [security guidelines](SECURITY.md)
- Open an issue on GitHub

# Acknowledgments

- OpenZeppelin for secure smart contract libraries
- Expo team for the amazing development platform
- Ethereum community for blockchain innovation

---

 
