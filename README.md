# Lancerscape2 - Web3 Freelancing Platform

A freelancing platform built with React Native, Expo, Node.js, and blockchain technology.

## Features

- Job posting and management
- Proposal system
- Secure payments with escrow
- User reputation system
- Real-time messaging
- Wallet integration

## Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Blockchain**: Solidity, Hardhat, Ethereum
- **Testing**: Jest, Supertest

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- MetaMask wallet
- PostgreSQL database
- Redis server

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/kiruthick-699/lancerscape2.git
cd lancerscape2
```

2. **Install dependencies**
```bash
npm install
cd backend && npm install && cd ..
```

3. **Set up environment variables**
```bash
cp backend/env.example backend/.env
cp .env.example .env
```

4. **Start the backend**
```bash
cd backend
npm run dev
```

5. **Start the frontend**
```bash
npx expo start
```

## Project Structure

```
lancerscape2/
├── app/                    # Expo Router app
├── backend/               # Node.js API
├── contracts/             # Smart contracts
├── components/            # React components
├── contexts/              # React contexts
├── services/              # Frontend services
└── types/                 # TypeScript definitions
```

## Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
npm test
```

## License

MIT License
