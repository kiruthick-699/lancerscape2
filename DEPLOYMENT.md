# 🚀 Smart Contract Deployment Guide

This guide will help you deploy the Lancerscape2 smart contracts to the Sepolia testnet.

## 📋 Prerequisites

1. **MetaMask Wallet** with Sepolia testnet configured
2. **Sepolia ETH** (get from [Sepolia Faucet](https://sepoliafaucet.com/))
3. **Infura Account** (for RPC endpoint)
4. **Etherscan API Key** (for contract verification)

## 🔧 Step 1: Environment Setup

### Create `.env` file in the root directory:

```bash
# Copy the example file
cp env.example .env

# Edit the .env file with your values
nano .env
```

### Required Environment Variables:

```env
# Blockchain Configuration
PRIVATE_KEY=your_private_key_here
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
ETHERSCAN_API_KEY=your_etherscan_api_key

# Frontend Configuration (will be filled after deployment)
EXPO_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
EXPO_PUBLIC_CHAIN_ID=11155111
EXPO_PUBLIC_JOB_POSTING_ADDRESS=
EXPO_PUBLIC_ESCROW_ADDRESS=
EXPO_PUBLIC_REPUTATION_ADDRESS=
```

### How to get these values:

1. **PRIVATE_KEY**: Export your MetaMask private key
   - Open MetaMask → Account → Export Private Key
   - ⚠️ **Never share this key!**

2. **SEPOLIA_URL**: Get from Infura
   - Go to [Infura](https://infura.io/)
   - Create a new project
   - Copy the Sepolia endpoint URL

3. **ETHERSCAN_API_KEY**: Get from Etherscan
   - Go to [Etherscan](https://etherscan.io/)
   - Create an account and get API key

## 🔧 Step 2: Install Dependencies

```bash
# Install Hardhat and dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts ethers
```

## 🔧 Step 3: Compile Contracts

```bash
# Compile all contracts
npx hardhat compile
```

This will create the `artifacts` folder with compiled contracts.

## 🚀 Step 4: Deploy Contracts

### Option A: Deploy to Sepolia Testnet

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

### Option B: Deploy to Local Network (for testing)

```bash
# Start local network
npx hardhat node

# Deploy to local network (in another terminal)
npx hardhat run scripts/deploy.js --network localhost
```

## 📋 Step 5: Deployment Output

After successful deployment, you'll see output like this:

```
🚀 Starting contract deployment...

📝 Deploying contracts with account: 0x742d...4aB7
💰 Account balance: 1.234567890123456789 ETH

📋 Deploying JobPosting contract...
✅ JobPosting deployed to: 0x1234567890123456789012345678901234567890

💰 Deploying Escrow contract...
✅ Escrow deployed to: 0x2345678901234567890123456789012345678901

🏆 Deploying Reputation contract...
✅ Reputation deployed to: 0x3456789012345678901234567890123456789012

🔗 Setting up contract relationships...
✅ Escrow contract set in JobPosting
✅ Reputation contract set in JobPosting
✅ JobPosting contract set in Escrow
✅ Reputation contract set in Escrow

🎉 Deployment completed successfully!

📋 Contract Addresses:
JobPosting: 0x1234567890123456789012345678901234567890
Escrow: 0x2345678901234567890123456789012345678901
Reputation: 0x3456789012345678901234567890123456789012

💾 Deployment info saved to deployment.json
```

## 🔧 Step 6: Update Environment Variables

Copy the contract addresses to your `.env` file:

```env
EXPO_PUBLIC_JOB_POSTING_ADDRESS=0x1234567890123456789012345678901234567890
EXPO_PUBLIC_ESCROW_ADDRESS=0x2345678901234567890123456789012345678901
EXPO_PUBLIC_REPUTATION_ADDRESS=0x3456789012345678901234567890123456789012
```

## 🔍 Step 7: Verify Contracts (Optional)

```bash
# Verify JobPosting contract
npx hardhat verify --network sepolia 0x1234567890123456789012345678901234567890

# Verify Escrow contract
npx hardhat verify --network sepolia 0x2345678901234567890123456789012345678901

# Verify Reputation contract
npx hardhat verify --network sepolia 0x3456789012345678901234567890123456789012
```

## 🧪 Step 8: Test the Deployment

### Test Job Posting:
1. Connect MetaMask to Sepolia testnet
2. Open your app
3. Click "Post Job" and fill the form
4. Approve the transaction in MetaMask

### Test Proposal Submission:
1. Switch to a different wallet (freelancer)
2. Browse jobs and click "Apply"
3. Submit a proposal
4. Approve the transaction

### Test Payment Processing:
1. As a client, manage your posted job
2. Release payment to freelancer
3. Verify the transaction on Etherscan

## 🔧 Troubleshooting

### Common Issues:

1. **Insufficient Gas**:
   ```bash
   # Check your Sepolia ETH balance
   # Get more from: https://sepoliafaucet.com/
   ```

2. **Wrong Network**:
   ```bash
   # Ensure MetaMask is on Sepolia testnet
   # Network ID: 11155111
   ```

3. **Contract Verification Failed**:
   ```bash
   # Check your Etherscan API key
   # Ensure you have enough API calls
   ```

4. **Deployment Failed**:
   ```bash
   # Check your private key format
   # Ensure you have enough Sepolia ETH
   # Check your Infura endpoint
   ```

## 📊 Deployment Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Contracts compiled
- [ ] Sepolia ETH obtained
- [ ] Contracts deployed
- [ ] Contract addresses saved
- [ ] Frontend environment updated
- [ ] Contracts verified (optional)
- [ ] Basic functionality tested

## 🎉 Success!

Once deployment is complete, your Lancerscape2 platform will be fully functional on the blockchain!

### Next Steps:
1. Test all features with real transactions
2. Monitor contract interactions
3. Deploy to mainnet when ready
4. Set up monitoring and analytics

---

**Need Help?** Check the troubleshooting section or open an issue on GitHub. 