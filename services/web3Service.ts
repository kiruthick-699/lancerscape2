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

  async initialize(config: Web3Config): Promise<void> {
    this.config = config;
    
    // Initialize provider (assuming MetaMask or similar wallet)
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
    } else {
      // Fallback to JSON-RPC provider
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    }

    // Initialize contracts
    this.jobPostingContract = new ethers.Contract(
      config.jobPostingAddress,
      JOB_POSTING_ABI,
      this.signer || this.provider
    );

    this.escrowContract = new ethers.Contract(
      config.escrowAddress,
      ESCROW_ABI,
      this.signer || this.provider
    );

    this.reputationContract = new ethers.Contract(
      config.reputationAddress,
      REPUTATION_ABI,
      this.signer || this.provider
    );
  }

  async connectWallet(): Promise<string> {
    if (!this.provider) {
      throw new Error('Web3Service not initialized');
    }

    try {
      // Request account access
      await this.provider.send('eth_requestAccounts', []);
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();
      
      // Re-initialize contracts with signer
      if (this.config) {
        this.jobPostingContract = new ethers.Contract(
          this.config.jobPostingAddress,
          JOB_POSTING_ABI,
          this.signer
        );

        this.escrowContract = new ethers.Contract(
          this.config.escrowAddress,
          ESCROW_ABI,
          this.signer
        );

        this.reputationContract = new ethers.Contract(
          this.config.reputationAddress,
          REPUTATION_ABI,
          this.signer
        );
      }

      return address;
    } catch (error) {
      throw new Error('Failed to connect wallet: ' + error);
    }
  }

  // Utility method to parse ETH to Wei
  parseEther(ethAmount: string): bigint {
    return ethers.parseEther(ethAmount);
  }

  // Utility method to format Wei to ETH
  formatEther(weiAmount: bigint): string {
    return ethers.formatEther(weiAmount);
  }

  // Job Posting Functions
  async postJob(
    title: string,
    description: string,
    budget: string,
    deadline: number,
    category: number,
    isRemote: boolean
  ): Promise<number> {
    if (!this.jobPostingContract || !this.signer) {
      throw new Error('Wallet not connected or contract not initialized');
    }

    try {
      // Validate inputs
      if (!title || !description || !budget) {
        throw new Error('Missing required fields');
      }

      if (deadline <= Math.floor(Date.now() / 1000)) {
        throw new Error('Deadline must be in the future');
      }

      // Convert budget to Wei
      const budgetInWei = this.parseEther(budget);

      // Estimate gas
      const gasEstimate = await this.jobPostingContract.postJob.estimateGas(
        title,
        description,
        budgetInWei,
        deadline,
        category,
        isRemote
      );

      // Post job with gas estimation
      const tx = await this.jobPostingContract.postJob(
        title,
        description,
        budgetInWei,
        deadline,
        category,
        isRemote,
        {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        }
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Find the JobPosted event
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsed = this.jobPostingContract?.interface.parseLog(log);
          return parsed?.name === 'JobPosted';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.jobPostingContract?.interface.parseLog(event);
        return Number(parsed?.args[0]); // jobId
      } else {
        throw new Error('Job posted but event not found');
      }
    } catch (error) {
      console.error('Error posting job:', error);
      throw new Error(`Failed to post job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJob(jobId: number): Promise<JobData> {
    if (!this.jobPostingContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const job = await this.jobPostingContract.getJob(jobId);
      return {
        id: job.id.toNumber(),
        client: job.client,
        title: job.title,
        description: job.description,
        budget: ethers.formatEther(job.budget),
        deadline: job.deadline.toNumber(),
        status: job.status,
        category: job.category,
        isRemote: job.isRemote,
        createdAt: job.createdAt.toNumber(),
        acceptedAt: job.acceptedAt.toNumber(),
        freelancer: job.freelancer
      };
    } catch (error) {
      throw new Error('Failed to get job: ' + error);
    }
  }

  async getTotalJobs(): Promise<number> {
    if (!this.jobPostingContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const total = await this.jobPostingContract.getTotalJobs();
      return total.toNumber();
    } catch (error) {
      throw new Error('Failed to get total jobs: ' + error);
    }
  }

  async submitProposal(
    jobId: number,
    proposedAmount: string,
    coverLetter: string,
    deliveryTime: number
  ): Promise<number> {
    if (!this.jobPostingContract || !this.signer) {
      throw new Error('Wallet not connected or contract not initialized');
    }

    try {
      // Validate inputs
      if (!coverLetter || deliveryTime <= 0) {
        throw new Error('Missing required fields');
      }

      // Convert proposed amount to Wei
      const proposedAmountInWei = this.parseEther(proposedAmount);

      // Estimate gas
      const gasEstimate = await this.jobPostingContract.submitProposal.estimateGas(
        jobId,
        proposedAmountInWei,
        coverLetter,
        deliveryTime
      );

      // Submit proposal with gas estimation
      const tx = await this.jobPostingContract.submitProposal(
        jobId,
        proposedAmountInWei,
        coverLetter,
        deliveryTime,
        {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        }
      );

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Find the ProposalSubmitted event
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsed = this.jobPostingContract?.interface.parseLog(log);
          return parsed?.name === 'ProposalSubmitted';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.jobPostingContract?.interface.parseLog(event);
        return Number(parsed?.args[0]); // proposalId
      } else {
        throw new Error('Proposal submitted but event not found');
      }
    } catch (error) {
      console.error('Error submitting proposal:', error);
      throw new Error(`Failed to submit proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Escrow Functions
  async createEscrow(jobId: number, freelancer: string, amount: string): Promise<number> {
    if (!this.escrowContract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    try {
      const amountWei = ethers.parseEther(amount);
      const tx = await this.escrowContract.createEscrow(jobId, freelancer, amountWei, {
        value: amountWei
      });
      
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === 'EscrowCreated');
      return event?.args?.escrowId?.toNumber() || 0;
    } catch (error) {
      throw new Error('Failed to create escrow: ' + error);
    }
  }

  async releasePayment(escrowId: number): Promise<void> {
    if (!this.escrowContract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    try {
      const tx = await this.escrowContract.releasePayment(escrowId);
      await tx.wait();
    } catch (error) {
      throw new Error('Failed to release payment: ' + error);
    }
  }

  async raiseDispute(escrowId: number, reason: string): Promise<void> {
    if (!this.escrowContract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    try {
      // Validate reason
      if (!reason || reason.trim().length === 0) {
        throw new Error('Dispute reason is required');
      }

      // Estimate gas
      const gasEstimate = await this.escrowContract.raiseDispute.estimateGas(
        escrowId,
        reason.trim()
      );

      // Raise dispute with gas estimation
      const tx = await this.escrowContract.raiseDispute(
        escrowId,
        reason.trim(),
        {
          gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
        }
      );

      await tx.wait();
    } catch (error) {
      console.error('Error raising dispute:', error);
      throw new Error(`Failed to raise dispute: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getEscrow(escrowId: number): Promise<EscrowData> {
    if (!this.escrowContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const escrow = await this.escrowContract.getEscrow(escrowId);
      return {
        id: escrow.id.toNumber(),
        jobId: escrow.jobId.toNumber(),
        client: escrow.client,
        freelancer: escrow.freelancer,
        amount: ethers.formatEther(escrow.amount),
        deadline: escrow.deadline.toNumber(),
        status: escrow.status,
        createdAt: escrow.createdAt.toNumber(),
        completedAt: escrow.completedAt.toNumber(),
        disputeReason: escrow.disputeReason,
        disputeInitiator: escrow.disputeInitiator
      };
    } catch (error) {
      throw new Error('Failed to get escrow: ' + error);
    }
  }

  // Reputation Functions
  async getUserReputation(userAddress: string): Promise<ReputationData> {
    if (!this.reputationContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const reputation = await this.reputationContract.getUserReputation(userAddress);
      return {
        totalScore: reputation.totalScore.toNumber(),
        completedJobs: reputation.completedJobs.toNumber(),
        totalEarnings: parseFloat(ethers.formatEther(reputation.totalEarnings)),
        averageRating: reputation.averageRating.toNumber(),
        reviewCount: reputation.reviewCount.toNumber()
      };
    } catch (error) {
      throw new Error('Failed to get user reputation: ' + error);
    }
  }

  async getUserBadges(userAddress: string): Promise<number[]> {
    if (!this.reputationContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const badges = await this.reputationContract.getUserBadges(userAddress);
      return badges.map((badge: any) => badge.toNumber());
    } catch (error) {
      throw new Error('Failed to get user badges: ' + error);
    }
  }

  async submitReview(reviewee: string, rating: number): Promise<void> {
    if (!this.reputationContract || !this.signer) {
      throw new Error('Contract not initialized or wallet not connected');
    }

    try {
      const tx = await this.reputationContract.submitReview(reviewee, rating);
      await tx.wait();
    } catch (error) {
      throw new Error('Failed to submit review: ' + error);
    }
  }

  // Utility Functions
  async getCurrentAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.signer.getAddress();
  }

  async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const targetAddress = address || await this.getCurrentAddress();
    const balance = await this.provider.getBalance(targetAddress);
    return ethers.formatEther(balance);
  }

  // Event Listeners
  onJobPosted(callback: (jobId: number, client: string, title: string, budget: string) => void) {
    if (!this.jobPostingContract) {
      throw new Error('Contract not initialized');
    }

    this.jobPostingContract.on('JobPosted', (jobId: any, client: any, title: any, budget: any) => {
      callback(
        jobId.toNumber(),
        client,
        title,
        ethers.formatEther(budget)
      );
    });
  }

  onPaymentReleased(callback: (escrowId: number, freelancer: string, amount: string) => void) {
    if (!this.escrowContract) {
      throw new Error('Contract not initialized');
    }

    this.escrowContract.on('PaymentReleased', (escrowId: any, freelancer: any, amount: any) => {
      callback(
        escrowId.toNumber(),
        freelancer,
        ethers.formatEther(amount)
      );
    });
  }
}

export const web3Service = new Web3Service();
export default web3Service; 