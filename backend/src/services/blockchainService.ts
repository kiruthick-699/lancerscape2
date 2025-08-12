import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { config } from '../config';
import { cacheService } from './cacheService';

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  gasLimit: number;
  gasPrice: number;
  confirmations: number;
  timeout: number;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  gasUsed?: number;
  blockNumber?: number;
  confirmations?: number;
}

export interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  gasUsed?: number;
}

export interface EscrowDetails {
  escrowId: string;
  client: string;
  freelancer: string;
  amount: string;
  status: 'pending' | 'funded' | 'released' | 'disputed' | 'refunded';
  deadline: number;
  createdAt: number;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private escrowContract: ethers.Contract;
  private jobPostingContract: ethers.Contract;
  private reputationContract: ethers.Contract;
  private isInitialized = false;

  constructor() {
    this.initializeProvider();
  }

  private async initializeProvider(): Promise<void> {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
      
      // Initialize wallet
      this.wallet = new ethers.Wallet(config.blockchain.privateKey, this.provider);
      
      // Initialize contracts
      this.escrowContract = new ethers.Contract(
        config.blockchain.contracts.escrow.address,
        config.blockchain.contracts.escrow.abi,
        this.wallet
      );
      
      this.jobPostingContract = new ethers.Contract(
        config.blockchain.contracts.jobPosting.address,
        config.blockchain.contracts.jobPosting.abi,
        this.wallet
      );
      
      this.reputationContract = new ethers.Contract(
        config.blockchain.contracts.reputation.address,
        config.blockchain.contracts.reputation.abi,
        this.wallet
      );

      // Verify connection
      const network = await this.provider.getNetwork();
      if (network.chainId !== BigInt(config.blockchain.chainId)) {
        throw new Error(`Chain ID mismatch. Expected: ${config.blockchain.chainId}, Got: ${network.chainId}`);
      }

      this.isInitialized = true;
      logger.info('Blockchain service initialized successfully', {
        chainId: network.chainId.toString(),
        address: this.wallet.address
      });
    } catch (error) {
      logger.error('Failed to initialize blockchain service:', error);
      this.isInitialized = false;
    }
  }

  // Check if service is ready
  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Blockchain service not initialized');
    }
  }

  // Get current gas price
  async getGasPrice(): Promise<bigint> {
    try {
      this.checkInitialized();
      const gasPrice = await this.provider.getFeeData();
      return gasPrice.gasPrice || ethers.parseUnits('20', 'gwei');
    } catch (error) {
      logger.error('Failed to get gas price:', error);
      return ethers.parseUnits('20', 'gwei'); // Fallback gas price
    }
  }

  // Estimate gas for transaction
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    try {
      this.checkInitialized();
      return await this.provider.estimateGas(transaction);
    } catch (error) {
      logger.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  // Send transaction with retry logic
  async sendTransaction(transaction: ethers.TransactionRequest): Promise<TransactionResult> {
    try {
      this.checkInitialized();
      
      // Set gas price if not provided
      if (!transaction.gasPrice) {
        transaction.gasPrice = await this.getGasPrice();
      }

      // Set gas limit if not provided
      if (!transaction.gasLimit) {
        transaction.gasLimit = await this.estimateGas(transaction);
      }

      // Send transaction
      const tx = await this.wallet.sendTransaction(transaction);
      logger.info('Transaction sent', { hash: tx.hash, gasLimit: transaction.gasLimit?.toString() });

      // Wait for confirmation
      const receipt = await tx.wait(config.blockchain.confirmations);
      
      logger.info('Transaction confirmed', {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
        confirmations: receipt?.confirmations
      });

      return {
        success: true,
        hash: tx.hash,
        gasUsed: Number(receipt?.gasUsed),
        blockNumber: receipt?.blockNumber,
        confirmations: receipt?.confirmations
      };
    } catch (error) {
      logger.error('Transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Call contract function (read-only)
  async callContract<T = any>(
    contract: ethers.Contract,
    functionName: string,
    args: any[] = []
  ): Promise<ContractCallResult<T>> {
    try {
      this.checkInitialized();
      
      const result = await contract[functionName](...args);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error(`Contract call failed for ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Execute contract function (write)
  async executeContract(
    contract: ethers.Contract,
    functionName: string,
    args: any[] = [],
    value: bigint = 0n
  ): Promise<TransactionResult> {
    try {
      this.checkInitialized();
      
      const transaction = await contract[functionName].populateTransaction(...args, { value });
      return await this.sendTransaction(transaction);
    } catch (error) {
      logger.error(`Contract execution failed for ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ESCROW CONTRACT FUNCTIONS

  // Create escrow
  async createEscrow(
    client: string,
    freelancer: string,
    amount: bigint,
    deadline: number
  ): Promise<TransactionResult> {
    try {
      // Validate addresses
      if (!ethers.isAddress(client) || !ethers.isAddress(freelancer)) {
        throw new Error('Invalid address format');
      }

      // Validate amount
      if (amount <= 0n) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate deadline
      if (deadline <= Math.floor(Date.now() / 1000)) {
        throw new Error('Deadline must be in the future');
      }

      // Check if freelancer is not the contract address
      if (freelancer === config.blockchain.contracts.escrow.address) {
        throw new Error('Freelancer cannot be the contract address');
      }

      const result = await this.executeContract(
        this.escrowContract,
        'createEscrow',
        [client, freelancer, deadline],
        amount
      );

      if (result.success) {
        // Cache escrow creation
        await cacheService.set(`escrow:${result.hash}`, {
          client,
          freelancer,
          amount: amount.toString(),
          deadline,
          createdAt: Math.floor(Date.now() / 1000)
        }, { ttl: 3600 });
      }

      return result;
    } catch (error) {
      logger.error('Failed to create escrow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Release escrow funds
  async releaseEscrow(escrowId: string): Promise<TransactionResult> {
    try {
      // Validate escrow ID
      if (!escrowId || escrowId.length === 0) {
        throw new Error('Invalid escrow ID');
      }

      const result = await this.executeContract(
        this.escrowContract,
        'releaseEscrow',
        [escrowId]
      );

      if (result.success) {
        // Invalidate escrow cache
        await cacheService.clearPattern(`escrow:*`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to release escrow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Dispute escrow
  async disputeEscrow(escrowId: string, reason: string): Promise<TransactionResult> {
    try {
      // Validate escrow ID
      if (!escrowId || escrowId.length === 0) {
        throw new Error('Invalid escrow ID');
      }

      // Validate reason
      if (!reason || reason.trim().length === 0) {
        throw new Error('Dispute reason is required');
      }

      const result = await this.executeContract(
        this.escrowContract,
        'disputeEscrow',
        [escrowId, reason.trim()]
      );

      if (result.success) {
        // Invalidate escrow cache
        await cacheService.clearPattern(`escrow:*`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to dispute escrow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get escrow details
  async getEscrowDetails(escrowId: string): Promise<ContractCallResult<EscrowDetails>> {
    try {
      // Try to get from cache first
      const cacheKey = `escrow:details:${escrowId}`;
      let details = await cacheService.get<EscrowDetails>(cacheKey);
      
      if (!details) {
        const result = await this.callContract<EscrowDetails>(
          this.escrowContract,
          'getEscrowDetails',
          [escrowId]
        );

        if (result.success && result.data) {
          details = result.data;
          // Cache for 5 minutes
          await cacheService.set(cacheKey, details, { ttl: 300 });
        }
      }

      return {
        success: true,
        data: details
      };
    } catch (error) {
      logger.error('Failed to get escrow details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Check if escrow exists
  async escrowExists(escrowId: string): Promise<ContractCallResult<boolean>> {
    try {
      const result = await this.callContract<boolean>(
        this.escrowContract,
        'escrowExists',
        [escrowId]
      );

      return result;
    } catch (error) {
      logger.error('Failed to check escrow existence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // JOB POSTING CONTRACT FUNCTIONS

  // Create job posting
  async createJobPosting(
    title: string,
    description: string,
    budget: bigint,
    deadline: number,
    category: number,
    isRemote: boolean
  ): Promise<TransactionResult> {
    try {
      // Validate inputs
      if (!title || title.trim().length === 0) {
        throw new Error('Job title is required');
      }

      if (!description || description.trim().length === 0) {
        throw new Error('Job description is required');
      }

      if (budget <= 0n) {
        throw new Error('Budget must be greater than 0');
      }

      if (deadline <= Math.floor(Date.now() / 1000)) {
        throw new Error('Deadline must be in the future');
      }

      if (category < 0 || category > 10) {
        throw new Error('Invalid category');
      }

      const result = await this.executeContract(
        this.jobPostingContract,
        'createJobPosting',
        [title.trim(), description.trim(), budget, deadline, category, isRemote]
      );

      if (result.success) {
        // Cache job creation
        await cacheService.set(`job:blockchain:${result.hash}`, {
          title: title.trim(),
          budget: budget.toString(),
          deadline,
          category,
          isRemote
        }, { ttl: 3600 });
      }

      return result;
    } catch (error) {
      logger.error('Failed to create job posting:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Submit proposal
  async submitProposal(
    jobId: string,
    proposedAmount: bigint,
    deliveryTime: number
  ): Promise<TransactionResult> {
    try {
      // Validate inputs
      if (!jobId || jobId.length === 0) {
        throw new Error('Job ID is required');
      }

      if (proposedAmount <= 0n) {
        throw new Error('Proposed amount must be greater than 0');
      }

      if (deliveryTime <= Math.floor(Date.now() / 1000)) {
        throw new Error('Delivery time must be in the future');
      }

      const result = await this.executeContract(
        this.jobPostingContract,
        'submitProposal',
        [jobId, proposedAmount, deliveryTime]
      );

      if (result.success) {
        // Cache proposal submission
        await cacheService.set(`proposal:blockchain:${result.hash}`, {
          jobId,
          proposedAmount: proposedAmount.toString(),
          deliveryTime
        }, { ttl: 3600 });
      }

      return result;
    } catch (error) {
      logger.error('Failed to submit proposal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // REPUTATION CONTRACT FUNCTIONS

  // Update reputation score
  async updateReputation(
    userAddress: string,
    score: number,
    review: string
  ): Promise<TransactionResult> {
    try {
      // Validate address
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address');
      }

      // Validate score
      if (score < 0 || score > 5) {
        throw new Error('Score must be between 0 and 5');
      }

      // Validate review
      if (!review || review.trim().length === 0) {
        throw new Error('Review is required');
      }

      const result = await this.executeContract(
        this.reputationContract,
        'updateReputation',
        [userAddress, score, review.trim()]
      );

      if (result.success) {
        // Invalidate user reputation cache
        await cacheService.clearPattern(`reputation:${userAddress}:*`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to update reputation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get reputation score
  async getReputationScore(userAddress: string): Promise<ContractCallResult<number>> {
    try {
      // Validate address
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address');
      }

      // Try to get from cache first
      const cacheKey = `reputation:score:${userAddress}`;
      let score = await cacheService.get<number>(cacheKey);
      
      if (score === null) {
        const result = await this.callContract<number>(
          this.reputationContract,
          'getReputationScore',
          [userAddress]
        );

        if (result.success && result.data !== undefined) {
          score = result.data;
          // Cache for 10 minutes
          await cacheService.set(cacheKey, score, { ttl: 600 });
        }
      }

      return {
        success: true,
        data: score
      };
    } catch (error) {
      logger.error('Failed to get reputation score:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // UTILITY FUNCTIONS

  // Get transaction status
  async getTransactionStatus(hash: string): Promise<{
    confirmed: boolean;
    confirmations: number;
    blockNumber?: number;
    gasUsed?: number;
  }> {
    try {
      this.checkInitialized();
      
      const receipt = await this.provider.getTransactionReceipt(hash);
      
      if (!receipt) {
        return { confirmed: false, confirmations: 0 };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      return {
        confirmed: confirmations >= config.blockchain.confirmations,
        confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: Number(receipt.gasUsed)
      };
    } catch (error) {
      logger.error('Failed to get transaction status:', error);
      return { confirmed: false, confirmations: 0 };
    }
  }

  // Get wallet balance
  async getWalletBalance(address?: string): Promise<bigint> {
    try {
      this.checkInitialized();
      const targetAddress = address || this.wallet.address;
      return await this.provider.getBalance(targetAddress);
    } catch (error) {
      logger.error('Failed to get wallet balance:', error);
      return 0n;
    }
  }

  // Get network info
  async getNetworkInfo(): Promise<{
    chainId: number;
    name: string;
    blockNumber: number;
    gasPrice: bigint;
  }> {
    try {
      this.checkInitialized();
      
      const [network, blockNumber, gasPrice] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.getFeeData()
      ]);

      return {
        chainId: Number(network.chainId),
        name: network.name || 'Unknown',
        blockNumber,
        gasPrice: gasPrice.gasPrice || 0n
      };
    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      this.checkInitialized();
      
      // Test basic operations
      await this.provider.getBlockNumber();
      await this.getWalletBalance();
      
      return true;
    } catch (error) {
      logger.error('Blockchain service health check failed:', error);
      return false;
    }
  }

  // Emergency stop (pause contracts)
  async emergencyStop(): Promise<TransactionResult> {
    try {
      this.checkInitialized();
      
      // Only allow admin to call emergency stop
      if (this.wallet.address !== config.blockchain.adminAddress) {
        throw new Error('Only admin can call emergency stop');
      }

      const result = await this.executeContract(
        this.escrowContract,
        'pause'
      );

      if (result.success) {
        logger.warn('Emergency stop activated - contracts paused');
      }

      return result;
    } catch (error) {
      logger.error('Failed to activate emergency stop:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Resume contracts after emergency stop
  async resumeContracts(): Promise<TransactionResult> {
    try {
      this.checkInitialized();
      
      // Only allow admin to resume contracts
      if (this.wallet.address !== config.blockchain.adminAddress) {
        throw new Error('Only admin can resume contracts');
      }

      const result = await this.executeContract(
        this.escrowContract,
        'unpause'
      );

      if (result.success) {
        logger.info('Contracts resumed after emergency stop');
      }

      return result;
    } catch (error) {
      logger.error('Failed to resume contracts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();

// Export for direct use
export default blockchainService;
