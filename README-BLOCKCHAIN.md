# 🚀 Lancerscape2 Blockchain Integration

This document explains the blockchain integration for the Lancerscape2 freelancing platform.

## 📋 Smart Contracts Overview

### 1. **JobPosting.sol** - Core Job Management
- **Purpose**: Handle job posting, proposals, and job lifecycle
- **Key Features**:
  - Post new jobs with budget and requirements
  - Submit and accept proposals
  - Track job status (Open → InProgress → Completed)
  - Manage job categories and remote/local work

### 2. **Escrow.sol** - Secure Payment System
- **Purpose**: Handle secure payments between clients and freelancers
- **Key Features**:
  - Create escrow payments for jobs
  - Release payments upon job completion
  - Dispute resolution system
  - Platform fee collection (0% initially, can be enabled later)

### 3. **Reputation.sol** - NFT Badges & Reputation
- **Purpose**: Manage user reputation and NFT badges
- **Key Features**:
  - ERC721 NFT badges for achievements
  - Reputation scoring system
  - Review and rating system
  - Badge rarity levels (Common → Legendary)

## 🔧 Setup Instructions

### Prerequisites
```bash
# Install Node.js (v16+)
# Install Hardhat
npm install -g hardhat

# Install blockchain dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts ethers
```

### 1. Environment Setup
Create a `.env` file:
```env
PRIVATE_KEY=your_private_key_here
SEPOLIA_URL=https://sepolia.infura.io/v3/your_project_id
POLYGON_URL=https://polygon-rpc.com
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 2. Compile Contracts
```bash
npx hardhat compile
```

### 3. Deploy Contracts

**Local Development:**
```bash
# Start local blockchain
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

**Testnet Deployment:**
```bash
# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Polygon testnet
npx hardhat run scripts/deploy.js --network polygon
```

### 4. Verify Contracts (Optional)
```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

## 🎯 Contract Functions

### JobPosting Contract
```solidity
// Post a new job
function postJob(
    string title,
    string description,
    uint256 budget,
    uint256 deadline,
    JobCategory category,
    bool isRemote
) external returns (uint256)

// Submit a proposal
function submitProposal(
    uint256 jobId,
    uint256 proposedAmount,
    string coverLetter,
    uint256 deliveryTime
) external

// Accept a proposal
function acceptProposal(uint256 proposalId) external

// Complete a job
function completeJob(uint256 jobId) external
```

### Escrow Contract
```solidity
// Create escrow payment
function createEscrow(
    uint256 jobId,
    address freelancer,
    uint256 amount
) external payable returns (uint256)

// Release payment to freelancer
function releasePayment(uint256 escrowId) external

// Raise dispute
function raiseDispute(uint256 escrowId, string reason) external
```

### Reputation Contract
```solidity
// Earn a badge
function earnBadge(uint256 badgeId) external

// Submit review
function submitReview(address reviewee, uint256 rating) external

// Get user reputation
function getUserReputation(address user) external view returns (
    uint256 totalScore,
    uint256 completedJobs,
    uint256 totalEarnings,
    uint256 averageRating,
    uint256 reviewCount
)
```

## 🔗 Frontend Integration

### 1. Initialize Web3 Service
```typescript
import web3Service from './services/web3Service';

const config = {
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID',
  jobPostingAddress: '0x...',
  escrowAddress: '0x...',
  reputationAddress: '0x...',
  chainId: 11155111 // Sepolia
};

await web3Service.initialize(config);
```

### 2. Connect Wallet
```typescript
const address = await web3Service.connectWallet();
console.log('Connected wallet:', address);
```

### 3. Post a Job
```typescript
const jobId = await web3Service.postJob(
  'React Native Developer Needed',
  'Build a mobile app with React Native...',
  '0.5', // 0.5 ETH
  Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  1, // Development category
  true // Remote work
);
```

### 4. Create Escrow Payment
```typescript
const escrowId = await web3Service.createEscrow(
  jobId,
  freelancerAddress,
  '0.5' // 0.5 ETH
);
```

### 5. Get User Reputation
```typescript
const reputation = await web3Service.getUserReputation(userAddress);
console.log('Total earnings:', reputation.totalEarnings);
console.log('Completed jobs:', reputation.completedJobs);
```

## 🎖️ Badge System

### Badge Types
- **Common**: First Job, Quick Responder
- **Rare**: Top Rated, Consistent Worker
- **Epic**: Verified Developer, High Earner
- **Legendary**: Platform Master, Elite Freelancer

### Earning Badges
```typescript
// Check if user has badge
const hasBadge = await web3Service.hasBadge(userAddress, badgeId);

// Get user's badges
const badges = await web3Service.getUserBadges(userAddress);
```

## 🔒 Security Features

### 1. **Access Control**
- Only job clients can accept proposals
- Only job freelancers can complete jobs
- Only escrow clients can release payments

### 2. **Dispute Resolution**
- Both parties can raise disputes
- Admin/DAO can resolve disputes
- Emergency refund functions for safety

### 3. **Platform Fees**
- 0% platform fee initially (no fees)
- Fees can be enabled later by contract owner
- Owner can withdraw fees when enabled

## 🧪 Testing

### Run Tests
```bash
npx hardhat test
```

### Test Coverage
```bash
npx hardhat coverage
```

## 📊 Gas Optimization

- **JobPosting**: ~150k gas for posting, ~80k for proposals
- **Escrow**: ~120k gas for creation, ~60k for release
- **Reputation**: ~100k gas for badge earning
- **No Platform Fees**: 100% of payments go to freelancers initially

## 🚨 Important Notes

### 1. **Network Selection**
- **Development**: Local Hardhat network
- **Testing**: Sepolia testnet
- **Production**: Polygon mainnet (recommended for low fees)

### 2. **Gas Management**
- Monitor gas prices before transactions
- Use gas estimation for user experience
- Consider batch operations for efficiency

### 3. **Error Handling**
- Always handle transaction failures
- Provide user-friendly error messages
- Implement retry mechanisms

## 🔄 Event Listeners

### Listen for New Jobs
```typescript
web3Service.onJobPosted((jobId, client, title, budget) => {
  console.log(`New job posted: ${title} for ${budget} ETH`);
  // Update UI with new job
});
```

### Listen for Payments
```typescript
web3Service.onPaymentReleased((escrowId, freelancer, amount) => {
  console.log(`Payment released: ${amount} ETH to ${freelancer}`);
  // Update UI with payment confirmation
});
```

## 📈 Next Steps

1. **Deploy to Testnet**: Test all functionality on Sepolia
2. **Frontend Integration**: Connect React Native app to contracts
3. **UI/UX**: Add blockchain transaction status indicators
4. **Analytics**: Track contract usage and user behavior
5. **Mainnet Deployment**: Deploy to Polygon mainnet
6. **Audit**: Get smart contracts audited by security firm

## 🆘 Troubleshooting

### Common Issues
1. **"Contract not initialized"**: Check if web3Service.initialize() was called
2. **"Wallet not connected"**: Ensure user has connected their wallet
3. **"Insufficient funds"**: Check user's ETH balance
4. **"Transaction failed"**: Check gas limits and network congestion

### Debug Commands
```bash
# Check contract deployment
npx hardhat run scripts/deploy.js --network localhost

# Verify contract on Etherscan
npx hardhat verify --network sepolia CONTRACT_ADDRESS

# Run specific tests
npx hardhat test test/JobPosting.test.js
```

---

**🎉 Congratulations!** You now have a fully functional Web3 freelancing platform with secure payments, reputation system, and NFT badges! 