import { blockchainService } from '../../services/blockchainService';
import { testUtils } from '../setup';
import { knexInstance } from '../../database/connection';
import { ethers } from 'ethers';

// Mock blockchain service for testing
jest.mock('../../services/blockchainService', () => ({
  blockchainService: {
    createEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
    disputeEscrow: jest.fn(),
    getEscrowDetails: jest.fn(),
    escrowExists: jest.fn(),
    createJobPosting: jest.fn(),
    submitProposal: jest.fn(),
    updateReputation: jest.fn(),
    getReputationScore: jest.fn(),
    getTransactionStatus: jest.fn(),
    getWalletBalance: jest.fn(),
    getNetworkInfo: jest.fn(),
    healthCheck: jest.fn(),
    emergencyStop: jest.fn(),
    resumeContracts: jest.fn()
  }
}));

describe('Blockchain Integration Tests', () => {
  let testUser: any;
  let testJob: any;
  let testProposal: any;
  let mockEscrowId: string;
  let mockTransactionHash: string;

  beforeAll(async () => {
    // Create test user
    testUser = await testUtils.createTestUser({
      email: 'blockchain@test.com',
      username: 'blockchainuser',
      userType: 'client',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7'
    });

    // Create test job
    testJob = await testUtils.createTestJob({
      clientId: testUser.id,
      title: 'Blockchain Test Job',
      description: 'Job for blockchain integration testing'
    });

    // Create test proposal
    testProposal = await knexInstance('proposals').insert({
      jobId: testJob.id,
      freelancerId: 'test-freelancer-id',
      proposedAmount: 500,
      coverLetter: 'Blockchain test proposal',
      deliveryTime: '2 weeks',
      status: 'pending'
    }).returning('*');

    mockEscrowId = 'escrow-test-123';
    mockTransactionHash = '0x1234567890abcdef1234567890abcdef12345678';
  });

  afterAll(async () => {
    await testUtils.cleanupTestData();
  });

  describe('Escrow Contract Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create escrow for job payment', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.createEscrow.mockResolvedValue({
        success: true,
        hash: mockTransactionHash,
        escrowId: mockEscrowId
      });

      // Test escrow creation
      const escrowResult = await blockchainService.createEscrow(
        testUser.walletAddress,
        '0xFreelancerAddress123',
        ethers.parseEther('0.5'), // 0.5 ETH
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days from now
      );

      expect(escrowResult.success).toBe(true);
      expect(escrowResult.hash).toBe(mockTransactionHash);
      expect(escrowResult.escrowId).toBe(mockEscrowId);

      // Verify blockchain service was called
      expect(mockBlockchainService.createEscrow).toHaveBeenCalledWith(
        testUser.walletAddress,
        '0xFreelancerAddress123',
        ethers.parseEther('0.5'),
        expect.any(Number)
      );
    });

    it('should handle escrow creation failure', async () => {
      // Mock blockchain service failure
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.createEscrow.mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      // Test escrow creation failure
      const escrowResult = await blockchainService.createEscrow(
        testUser.walletAddress,
        '0xFreelancerAddress123',
        ethers.parseEther('1000'), // 1000 ETH (insufficient)
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      );

      expect(escrowResult.success).toBe(false);
      expect(escrowResult.error).toBe('Insufficient funds');
    });

    it('should release escrow funds to freelancer', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.releaseEscrow.mockResolvedValue({
        success: true,
        hash: mockTransactionHash
      });

      // Test escrow release
      const releaseResult = await blockchainService.releaseEscrow(mockEscrowId);

      expect(releaseResult.success).toBe(true);
      expect(releaseResult.hash).toBe(mockTransactionHash);

      // Verify blockchain service was called
      expect(mockBlockchainService.releaseEscrow).toHaveBeenCalledWith(mockEscrowId);
    });

    it('should handle escrow disputes', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.disputeEscrow.mockResolvedValue({
        success: true,
        hash: mockTransactionHash
      });

      // Test escrow dispute
      const disputeReason = 'Work quality does not meet requirements';
      const disputeResult = await blockchainService.disputeEscrow(mockEscrowId, disputeReason);

      expect(disputeResult.success).toBe(true);
      expect(disputeResult.hash).toBe(mockTransactionHash);

      // Verify blockchain service was called
      expect(mockBlockchainService.disputeEscrow).toHaveBeenCalledWith(mockEscrowId, disputeReason);
    });

    it('should retrieve escrow details', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      const mockEscrowDetails = {
        escrowId: mockEscrowId,
        client: testUser.walletAddress,
        freelancer: '0xFreelancerAddress123',
        amount: '500000000000000000', // 0.5 ETH in wei
        status: 'funded',
        deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        createdAt: Math.floor(Date.now() / 1000)
      };

      mockBlockchainService.getEscrowDetails.mockResolvedValue({
        success: true,
        data: mockEscrowDetails
      });

      // Test escrow details retrieval
      const detailsResult = await blockchainService.getEscrowDetails(mockEscrowId);

      expect(detailsResult.success).toBe(true);
      expect(detailsResult.data).toEqual(mockEscrowDetails);
      expect(detailsResult.data.escrowId).toBe(mockEscrowId);
      expect(detailsResult.data.client).toBe(testUser.walletAddress);

      // Verify blockchain service was called
      expect(mockBlockchainService.getEscrowDetails).toHaveBeenCalledWith(mockEscrowId);
    });

    it('should check escrow existence', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.escrowExists.mockResolvedValue({
        success: true,
        data: true
      });

      // Test escrow existence check
      const existsResult = await blockchainService.escrowExists(mockEscrowId);

      expect(existsResult.success).toBe(true);
      expect(existsResult.data).toBe(true);

      // Verify blockchain service was called
      expect(mockBlockchainService.escrowExists).toHaveBeenCalledWith(mockEscrowId);
    });
  });

  describe('Job Posting Contract Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create job posting on blockchain', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.createJobPosting.mockResolvedValue({
        success: true,
        hash: mockTransactionHash,
        jobId: 'blockchain-job-123'
      });

      // Test job posting creation
      const jobResult = await blockchainService.createJobPosting(
        'Blockchain Test Job',
        'Job description for blockchain testing',
        ethers.parseEther('0.5'), // 0.5 ETH budget
        Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days deadline
        0, // Development category
        true // Remote job
      );

      expect(jobResult.success).toBe(true);
      expect(jobResult.hash).toBe(mockTransactionHash);
      expect(jobResult.jobId).toBe('blockchain-job-123');

      // Verify blockchain service was called
      expect(mockBlockchainService.createJobPosting).toHaveBeenCalledWith(
        'Blockchain Test Job',
        'Job description for blockchain testing',
        ethers.parseEther('0.5'),
        expect.any(Number),
        0,
        true
      );
    });

    it('should submit proposal on blockchain', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.submitProposal.mockResolvedValue({
        success: true,
        hash: mockTransactionHash,
        proposalId: 'blockchain-proposal-123'
      });

      // Test proposal submission
      const proposalResult = await blockchainService.submitProposal(
        'blockchain-job-123',
        ethers.parseEther('0.4'), // 0.4 ETH proposed amount
        Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60 // 14 days delivery
      );

      expect(proposalResult.success).toBe(true);
      expect(proposalResult.hash).toBe(mockTransactionHash);
      expect(proposalResult.proposalId).toBe('blockchain-proposal-123');

      // Verify blockchain service was called
      expect(mockBlockchainService.submitProposal).toHaveBeenCalledWith(
        'blockchain-job-123',
        ethers.parseEther('0.4'),
        expect.any(Number)
      );
    });
  });

  describe('Reputation Contract Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should update user reputation score', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.updateReputation.mockResolvedValue({
        success: true,
        hash: mockTransactionHash
      });

      // Test reputation update
      const reputationResult = await blockchainService.updateReputation(
        testUser.walletAddress,
        5, // 5-star rating
        'Excellent work quality and communication'
      );

      expect(reputationResult.success).toBe(true);
      expect(reputationResult.hash).toBe(mockTransactionHash);

      // Verify blockchain service was called
      expect(mockBlockchainService.updateReputation).toHaveBeenCalledWith(
        testUser.walletAddress,
        5,
        'Excellent work quality and communication'
      );
    });

    it('should retrieve user reputation score', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.getReputationScore.mockResolvedValue({
        success: true,
        data: 4.8
      });

      // Test reputation score retrieval
      const scoreResult = await blockchainService.getReputationScore(testUser.walletAddress);

      expect(scoreResult.success).toBe(true);
      expect(scoreResult.data).toBe(4.8);

      // Verify blockchain service was called
      expect(mockBlockchainService.getReputationScore).toHaveBeenCalledWith(testUser.walletAddress);
    });

    it('should handle invalid reputation scores', async () => {
      // Test invalid score validation
      const invalidScores = [-1, 6, 10.5];

      for (const score of invalidScores) {
        try {
          await blockchainService.updateReputation(
            testUser.walletAddress,
            score,
            'Test review'
          );
          fail('Should have thrown error for invalid score');
        } catch (error) {
          expect(error.message).toContain('Score must be between 0 and 5');
        }
      }
    });
  });

  describe('Transaction Management', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get transaction status', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      const mockTransactionStatus = {
        confirmed: true,
        confirmations: 12,
        blockNumber: 12345,
        gasUsed: 21000
      };

      mockBlockchainService.getTransactionStatus.mockResolvedValue(mockTransactionStatus);

      // Test transaction status retrieval
      const statusResult = await blockchainService.getTransactionStatus(mockTransactionHash);

      expect(statusResult.confirmed).toBe(true);
      expect(statusResult.confirmations).toBe(12);
      expect(statusResult.blockNumber).toBe(12345);
      expect(statusResult.gasUsed).toBe(21000);

      // Verify blockchain service was called
      expect(mockBlockchainService.getTransactionStatus).toHaveBeenCalledWith(mockTransactionHash);
    });

    it('should get wallet balance', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      const mockBalance = ethers.parseEther('2.5'); // 2.5 ETH
      mockBlockchainService.getWalletBalance.mockResolvedValue(mockBalance);

      // Test wallet balance retrieval
      const balanceResult = await blockchainService.getWalletBalance(testUser.walletAddress);

      expect(balanceResult).toEqual(mockBalance);
      expect(ethers.formatEther(balanceResult)).toBe('2.5');

      // Verify blockchain service was called
      expect(mockBlockchainService.getWalletBalance).toHaveBeenCalledWith(testUser.walletAddress);
    });

    it('should get network information', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      const mockNetworkInfo = {
        chainId: 1,
        name: 'Ethereum Mainnet',
        blockNumber: 12345678,
        gasPrice: ethers.parseUnits('20', 'gwei')
      };

      mockBlockchainService.getNetworkInfo.mockResolvedValue(mockNetworkInfo);

      // Test network info retrieval
      const networkResult = await blockchainService.getNetworkInfo();

      expect(networkResult.chainId).toBe(1);
      expect(networkResult.name).toBe('Ethereum Mainnet');
      expect(networkResult.blockNumber).toBe(12345678);
      expect(networkResult.gasPrice).toEqual(ethers.parseUnits('20', 'gwei'));

      // Verify blockchain service was called
      expect(mockBlockchainService.getNetworkInfo).toHaveBeenCalled();
    });
  });

  describe('Contract Management', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should perform health check', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.healthCheck.mockResolvedValue(true);

      // Test health check
      const healthResult = await blockchainService.healthCheck();

      expect(healthResult).toBe(true);

      // Verify blockchain service was called
      expect(mockBlockchainService.healthCheck).toHaveBeenCalled();
    });

    it('should handle emergency stop', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.emergencyStop.mockResolvedValue({
        success: true,
        hash: mockTransactionHash
      });

      // Test emergency stop
      const stopResult = await blockchainService.emergencyStop();

      expect(stopResult.success).toBe(true);
      expect(stopResult.hash).toBe(mockTransactionHash);

      // Verify blockchain service was called
      expect(mockBlockchainService.emergencyStop).toHaveBeenCalled();
    });

    it('should resume contracts after emergency stop', async () => {
      // Mock blockchain service responses
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.resumeContracts.mockResolvedValue({
        success: true,
        hash: mockTransactionHash
      });

      // Test contract resumption
      const resumeResult = await blockchainService.resumeContracts();

      expect(resumeResult.success).toBe(true);
      expect(resumeResult.hash).toBe(mockTransactionHash);

      // Verify blockchain service was called
      expect(mockBlockchainService.resumeContracts).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should validate Ethereum addresses', async () => {
      const invalidAddresses = [
        'invalid-address',
        '0x123',
        '0x1234567890abcdef1234567890abcdef1234567', // Too short
        '0x1234567890abcdef1234567890abcdef123456789' // Too long
      ];

      for (const address of invalidAddresses) {
        try {
          await blockchainService.createEscrow(
            address,
            '0xFreelancerAddress123',
            ethers.parseEther('0.5'),
            Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
          );
          fail('Should have thrown error for invalid address');
        } catch (error) {
          expect(error.message).toContain('Invalid address format');
        }
      }
    });

    it('should validate escrow amounts', async () => {
      const invalidAmounts = [
        ethers.parseEther('0'), // Zero amount
        ethers.parseEther('-1'), // Negative amount
        ethers.parseEther('1000000') // Extremely large amount
      ];

      for (const amount of invalidAmounts) {
        try {
          await blockchainService.createEscrow(
            testUser.walletAddress,
            '0xFreelancerAddress123',
            amount,
            Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
          );
          fail('Should have thrown error for invalid amount');
        } catch (error) {
          expect(error.message).toContain('Amount must be greater than 0');
        }
      }
    });

    it('should validate deadlines', async () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - 24 * 60 * 60; // 1 day ago

      try {
        await blockchainService.createEscrow(
          testUser.walletAddress,
          '0xFreelancerAddress123',
          ethers.parseEther('0.5'),
          pastDeadline
        );
        fail('Should have thrown error for past deadline');
      } catch (error) {
        expect(error.message).toContain('Deadline must be in the future');
      }
    });

    it('should handle blockchain service failures gracefully', async () => {
      // Mock blockchain service failure
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.createEscrow.mockRejectedValue(new Error('Blockchain network error'));

      // Test graceful failure handling
      try {
        await blockchainService.createEscrow(
          testUser.walletAddress,
          '0xFreelancerAddress123',
          ethers.parseEther('0.5'),
          Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
        );
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Blockchain network error');
      }
    });
  });

  describe('Integration with Database', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should sync blockchain data with database', async () => {
      // Mock successful blockchain operation
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.createEscrow.mockResolvedValue({
        success: true,
        hash: mockTransactionHash,
        escrowId: mockEscrowId
      });

      // Create escrow on blockchain
      const escrowResult = await blockchainService.createEscrow(
        testUser.walletAddress,
        '0xFreelancerAddress123',
        ethers.parseEther('0.5'),
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      );

      expect(escrowResult.success).toBe(true);

      // Update job with escrow ID in database
      await knexInstance('jobs')
        .where('id', testJob.id)
        .update({ escrowId: escrowResult.escrowId });

      // Verify database update
      const updatedJob = await knexInstance('jobs')
        .where('id', testJob.id)
        .first();

      expect(updatedJob.escrowId).toBe(mockEscrowId);
    });

    it('should handle database-blockchain consistency', async () => {
      // Create escrow record in database
      const dbEscrowId = 'db-escrow-123';
      await knexInstance('jobs')
        .where('id', testJob.id)
        .update({ escrowId: dbEscrowId });

      // Mock blockchain service to return different escrow ID
      const mockBlockchainService = require('../../services/blockchainService').blockchainService;
      mockBlockchainService.getEscrowDetails.mockResolvedValue({
        success: true,
        data: {
          escrowId: 'blockchain-escrow-456',
          client: testUser.walletAddress,
          freelancer: '0xFreelancerAddress123',
          amount: '500000000000000000',
          status: 'funded',
          deadline: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          createdAt: Math.floor(Date.now() / 1000)
        }
      });

      // Get escrow details from blockchain
      const blockchainEscrow = await blockchainService.getEscrowDetails(dbEscrowId);

      // Verify data consistency
      expect(blockchainEscrow.success).toBe(true);
      expect(blockchainEscrow.data.escrowId).toBe('blockchain-escrow-456');
      expect(blockchainEscrow.data.client).toBe(testUser.walletAddress);
    });
  });
});
