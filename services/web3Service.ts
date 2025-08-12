import { ethers } from 'ethers';
import { JobPosting__factory, Escrow__factory, Reputation__factory } from '../contracts/typechain';

// Contract ABIs (you'll need to generate these from your compiled contracts)
const JOB_POSTING_ABI = [
  "function postJob(string title, string description, uint256 budget, uint256 deadline, uint8 category, bool isRemote) external returns (uint256)",
  "function getJob(uint256 jobId) external view returns (tuple(uint256 id, address client, string title, string description, uint256 budget, uint256 deadline, uint8 status, uint8 category, bool isRemote, uint256 createdAt, uint256 acceptedAt, address freelancer))",
  "function getTotalJobs() external view returns (uint256)",
  "function submitProposal(uint256 jobId, uint256 proposedAmount, string coverLetter, uint256 deliveryTime) external",
  "function acceptProposal(uint256 proposalId) external",
  "function completeJob(uint256 jobId) external",
  "event JobPosted(uint256 indexed jobId, address indexed client, string title, uint256 budget)",
  "event ProposalSubmitted(uint256 indexed proposalId, uint256 indexed jobId, address indexed freelancer)",
  "event JobAccepted(uint256 indexed jobId, address indexed freelancer)",
  "event JobCompleted(uint256 indexed jobId)"
];

const ESCROW_ABI = [
  "function createEscrow(uint256 jobId, address freelancer, uint256 amount) external payable returns (uint256)",
  "function releasePayment(uint256 escrowId) external",
  "function raiseDispute(uint256 escrowId, string reason) external",
  "function getEscrow(uint256 escrowId) external view returns (tuple(uint256 id, uint256 jobId, address client, address freelancer, uint256 amount, uint256 deadline, uint8 status, uint256 createdAt, uint256 completedAt, string disputeReason, address disputeInitiator))",
  "event EscrowCreated(uint256 indexed escrowId, uint256 indexed jobId, address indexed client, uint256 amount)",
  "event PaymentReleased(uint256 indexed escrowId, address indexed freelancer, uint256 amount)"
];

const REPUTATION_ABI = [
  "function earnBadge(uint256 badgeId) external",
  "function getUserReputation(address user) external view returns (uint256 totalScore, uint256 completedJobs, uint256 totalEarnings, uint256 averageRating, uint256 reviewCount)",
  "function getUserBadges(address user) external view returns (uint256[])",
  "function hasBadge(address user, uint256 badgeId) external view returns (bool)",
  "function submitReview(address reviewee, uint256 rating) external",
  "event BadgeEarned(uint256 indexed badgeId, address indexed user)",
  "event ReputationUpdated(address indexed user, uint256 newScore)"
];

export interface Web3Config {
  rpcUrl: string;
  jobPostingAddress: string;
  escrowAddress: string;
  reputationAddress: string;
  chainId: number;
}

export interface JobData {
  id: number;
  client: string;
  title: string;
  description: string;
  budget: string;
  deadline: number;
  status: number;
  category: number;
  isRemote: boolean;
  createdAt: number;
  acceptedAt: number;
  freelancer: string;
}

export interface EscrowData {
  id: number;
  jobId: number;
  client: string;
  freelancer: string;
  amount: string;
  deadline: number;
  status: number;
  createdAt: number;
  completedAt: number;
  disputeReason: string;
  disputeInitiator: string;
}

export interface ReputationData {
  totalScore: number;
  completedJobs: number;
  totalEarnings: number;
  averageRating: number;
  reviewCount: number;
}

class Web3Service {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private jobPostingContract: ethers.Contract | null = null;
  private escrowContract: ethers.Contract | null = null;
  private reputationContract: ethers.Contract | null = null;
  private config: Web3Config | null = null;
  private isDemoMode: boolean = false;

  async initialize(config: Web3Config): Promise<void> {
    this.config = config;
    
    // Check if we're in demo mode (no valid RPC URL or contract addresses)
    if (!config.rpcUrl || config.rpcUrl.includes('YOUR_PROJECT_ID') || 
        !config.jobPostingAddress || config.jobPostingAddress === '0x...') {
      this.isDemoMode = true;
      // Production logging would go here
      return;
    }
    
    try {
      // Initialize provider (assuming MetaMask or similar wallet)
      if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
      } else {
        // Fallback to JSON-RPC provider
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      }

      // Initialize contracts
      if (config.jobPostingAddress && config.jobPostingAddress !== '0x...') {
        this.jobPostingContract = new ethers.Contract(
          config.jobPostingAddress,
          JOB_POSTING_ABI,
          this.signer || this.provider
        );
      }

      if (config.escrowAddress && config.escrowAddress !== '0x...') {
        this.escrowContract = new ethers.Contract(
          config.escrowAddress,
          ESCROW_ABI,
          this.signer || this.provider
        );
      }

      if (config.reputationAddress && config.reputationAddress !== '0x...') {
        this.reputationContract = new ethers.Contract(
          config.reputationAddress,
          REPUTATION_ABI,
          this.signer || this.provider
        );
      }
    } catch (error) {
      // Production logging would go here
      this.isDemoMode = true;
    }
  }

  async connectWallet(): Promise<string> {
    if (this.isDemoMode) {
      // Demo mode: return a mock address
      return '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7';
    }

    if (!this.provider) {
      throw new Error('Web3 provider not initialized');
    }

    try {
      const address = await this.provider.getSigner().getAddress();
      return address;
    } catch (error) {
      throw new Error('Failed to connect wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  parseEther(ethAmount: string): bigint {
    return ethers.parseEther(ethAmount);
  }

  formatEther(weiAmount: bigint): string {
    return ethers.formatEther(weiAmount);
  }

  async postJob(
    title: string,
    description: string,
    budget: string,
    deadline: number,
    category: number,
    isRemote: boolean
  ): Promise<number> {
    if (this.isDemoMode) {
      // Demo mode: return a mock job ID
      return Math.floor(Math.random() * 1000) + 1;
    }

    if (!this.jobPostingContract || !this.signer) {
      throw new Error('Job posting contract not initialized or wallet not connected');
    }

    try {
      const budgetWei = this.parseEther(budget);
      const deadlineTimestamp = Math.floor(deadline / 1000);
      
      const tx = await this.jobPostingContract.postJob(
        title,
        description,
        budgetWei,
        deadlineTimestamp,
        category,
        isRemote
      );
      
      const receipt = await tx.wait();
      
      // Extract job ID from events
      const jobPostedEvent = receipt?.logs?.find((log: any) => 
        log.eventName === 'JobPosted'
      );
      
      if (jobPostedEvent) {
        return jobPostedEvent.args[0];
      }
      
      throw new Error('Failed to extract job ID from transaction');
    } catch (error) {
      throw new Error('Failed to post job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getJob(jobId: number): Promise<JobData> {
    if (this.isDemoMode) {
      // Demo mode: return mock job data
      return {
        id: jobId,
        client: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7',
        title: 'Demo Job',
        description: 'This is a demo job',
        budget: '1000000000000000000', // 1 ETH in wei
        deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
        status: 0,
        category: 0,
        isRemote: true,
        createdAt: Date.now(),
        acceptedAt: 0,
        freelancer: '0x0000000000000000000000000000000000000000'
      };
    }

    if (!this.jobPostingContract) {
      throw new Error('Job posting contract not initialized');
    }

    try {
      const job = await this.jobPostingContract.getJob(jobId);
      return job;
    } catch (error) {
      throw new Error('Failed to get job: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getTotalJobs(): Promise<number> {
    if (this.isDemoMode) {
      return 10;
    }

    if (!this.jobPostingContract) {
      throw new Error('Job posting contract not initialized');
    }

    try {
      const totalJobs = await this.jobPostingContract.getTotalJobs();
      return Number(totalJobs);
    } catch (error) {
      throw new Error('Failed to get total jobs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async submitProposal(
    jobId: number,
    proposedAmount: string,
    coverLetter: string,
    deliveryTime: number
  ): Promise<number> {
    if (this.isDemoMode) {
      return Math.floor(Math.random() * 1000) + 1;
    }

    if (!this.jobPostingContract || !this.signer) {
      throw new Error('Job posting contract not initialized or wallet not connected');
    }

    try {
      const amountWei = this.parseEther(proposedAmount);
      const deliveryTimeSeconds = Math.floor(deliveryTime / 1000);
      
      const tx = await this.jobPostingContract.submitProposal(
        jobId,
        amountWei,
        coverLetter,
        deliveryTimeSeconds
      );
      
      const receipt = await tx.wait();
      
      // Extract proposal ID from events
      const proposalSubmittedEvent = receipt?.logs?.find((log: any) => 
        log.eventName === 'ProposalSubmitted'
      );
      
      if (proposalSubmittedEvent) {
        return proposalSubmittedEvent.args[0];
      }
      
      throw new Error('Failed to extract proposal ID from transaction');
    } catch (error) {
      throw new Error('Error submitting proposal: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async createEscrow(jobId: number, freelancer: string, amount: string): Promise<number> {
    if (this.isDemoMode) {
      return Math.floor(Math.random() * 1000) + 1;
    }

    if (!this.escrowContract || !this.signer) {
      throw new Error('Escrow contract not initialized or wallet not connected');
    }

    try {
      const amountWei = this.parseEther(amount);
      const tx = await this.escrowContract.createEscrow(jobId, freelancer, amountWei, { value: amountWei });
      const receipt = await tx.wait();
      
      const escrowCreatedEvent = receipt?.logs?.find((log: any) => 
        log.eventName === 'EscrowCreated'
      );
      
      if (escrowCreatedEvent) {
        return escrowCreatedEvent.args[0];
      }
      
      throw new Error('Failed to extract escrow ID from transaction');
    } catch (error) {
      throw new Error('Failed to create escrow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async releasePayment(escrowId: number): Promise<void> {
    if (this.isDemoMode) {
      return;
    }

    if (!this.escrowContract || !this.signer) {
      throw new Error('Escrow contract not initialized or wallet not connected');
    }

    try {
      const tx = await this.escrowContract.releasePayment(escrowId);
      await tx.wait();
    } catch (error) {
      throw new Error('Failed to release payment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async raiseDispute(escrowId: number, reason: string): Promise<void> {
    if (this.isDemoMode) {
      return;
    }

    if (!this.escrowContract || !this.signer) {
      throw new Error('Escrow contract not initialized or wallet not connected');
    }

    try {
      const tx = await this.escrowContract.raiseDispute(escrowId, reason);
      await tx.wait();
    } catch (error) {
      throw new Error('Error raising dispute: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getEscrow(escrowId: number): Promise<EscrowData> {
    if (this.isDemoMode) {
      return {
        id: escrowId,
        jobId: 1,
        client: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7',
        freelancer: '0x1234567890123456789012345678901234567890',
        amount: '1000000000000000000',
        deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
        status: 0,
        createdAt: Date.now(),
        completedAt: 0,
        disputeReason: '',
        disputeInitiator: '0x0000000000000000000000000000000000000000'
      };
    }

    if (!this.escrowContract) {
      throw new Error('Escrow contract not initialized');
    }

    try {
      const escrow = await this.escrowContract.getEscrow(escrowId);
      return escrow;
    } catch (error) {
      throw new Error('Failed to get escrow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getUserReputation(userAddress: string): Promise<ReputationData> {
    if (this.isDemoMode) {
      return {
        totalScore: 850,
        completedJobs: 15,
        totalEarnings: 50000000000000000000n, // 50 ETH in wei
        averageRating: 4.8,
        reviewCount: 12
      };
    }

    if (!this.reputationContract) {
      throw new Error('Reputation contract not initialized');
    }

    try {
      const reputation = await this.reputationContract.getUserReputation(userAddress);
      return reputation;
    } catch (error) {
      throw new Error('Failed to get user reputation: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getUserBadges(userAddress: string): Promise<number[]> {
    if (this.isDemoMode) {
      return [1, 2, 3];
    }

    if (!this.reputationContract) {
      throw new Error('Reputation contract not initialized');
    }

    try {
      const badges = await this.reputationContract.getUserBadges(userAddress);
      return badges;
    } catch (error) {
      throw new Error('Failed to get user badges: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async submitReview(reviewee: string, rating: number): Promise<void> {
    if (this.isDemoMode) {
      return;
    }

    if (!this.reputationContract || !this.signer) {
      throw new Error('Reputation contract not initialized or wallet not connected');
    }

    try {
      const tx = await this.reputationContract.submitReview(reviewee, rating);
      await tx.wait();
    } catch (error) {
      throw new Error('Failed to submit review: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getCurrentAddress(): Promise<string> {
    if (this.isDemoMode) {
      return '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7';
    }

    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.signer.getAddress();
    } catch (error) {
      throw new Error('Failed to get current address: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getBalance(address?: string): Promise<string> {
    if (this.isDemoMode) {
      return '2.5';
    }

    if (!this.provider) {
      throw new Error('Web3 provider not initialized');
    }

    try {
      const targetAddress = address || await this.getCurrentAddress();
      const balance = await this.provider.getBalance(targetAddress);
      return this.formatEther(balance);
    } catch (error) {
      throw new Error('Failed to get balance: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  onJobPosted(callback: (jobId: number, client: string, title: string, budget: string) => void) {
    if (this.isDemoMode || !this.jobPostingContract) {
      return;
    }

    this.jobPostingContract.on('JobPosted', (jobId, client, title, budget) => {
      callback(Number(jobId), client, title, this.formatEther(budget));
    });
  }

  onPaymentReleased(callback: (escrowId: number, freelancer: string, amount: string) => void) {
    if (this.isDemoMode || !this.escrowContract) {
      return;
    }

    this.escrowContract.on('PaymentReleased', (escrowId, freelancer, amount) => {
      callback(Number(escrowId), freelancer, this.formatEther(amount));
    });
  }
}

const web3Service = new Web3Service();
export default web3Service; 