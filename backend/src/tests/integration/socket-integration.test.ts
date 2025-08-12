import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client } from 'socket.io-client';
import { testUtils } from '../setup';
import { knexInstance } from '../../database/connection';
import { websocketService } from '../../services/websocket';

// Mock WebSocket service
jest.mock('../../services/websocket', () => ({
  websocketService: {
    initialize: jest.fn(),
    emitToUser: jest.fn(),
    emitToRoom: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    broadcast: jest.fn()
  }
}));

describe('Socket Integration Tests', () => {
  let httpServer: any;
  let ioServer: any;
  let clientSocket: any;
  let testUser: any;
  let testJob: any;
  let testProposal: any;

  beforeAll(async () => {
    // Create test user
    testUser = await testUtils.createTestUser({
      email: 'socket@test.com',
      username: 'socketuser',
      userType: 'client'
    });

    // Create test job
    testJob = await testUtils.createTestJob({
      clientId: testUser.id,
      title: 'Socket Test Job',
      description: 'Job for socket integration testing'
    });

    // Create test proposal
    testProposal = await knexInstance('proposals').insert({
      jobId: testJob.id,
      freelancerId: 'test-freelancer-id',
      proposedAmount: 500,
      coverLetter: 'Socket test proposal',
      deliveryTime: '2 weeks',
      status: 'pending'
    }).returning('*');

    // Setup Socket.IO server
    httpServer = createServer();
    ioServer = new Server(httpServer);
    
    // Initialize WebSocket service
    websocketService.initialize(ioServer);
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await testUtils.cleanupTestData();
    
    // Cleanup sockets
    if (clientSocket) {
      clientSocket.close();
    }
    if (ioServer) {
      ioServer.close();
    }
    if (httpServer) {
      httpServer.close();
    }
  });

  beforeEach(async () => {
    // Connect client socket
    const port = httpServer.address().port;
    clientSocket = Client(`http://localhost:${port}`);
    
    // Wait for connection
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', () => resolve());
    });
  });

  afterEach(async () => {
    // Disconnect client socket
    if (clientSocket) {
      clientSocket.disconnect();
    }
    
    // Clear mocks
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish socket connection successfully', () => {
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
    });

    it('should authenticate user on connection', async () => {
      const authData = {
        userId: testUser.id,
        token: 'test-auth-token'
      };

      // Emit authentication event
      clientSocket.emit('authenticate', authData);

      // Wait for authentication response
      const authResponse = await new Promise((resolve) => {
        clientSocket.on('authenticated', resolve);
        clientSocket.on('auth_error', resolve);
      });

      expect(authResponse).toBeDefined();
    });

    it('should handle connection errors gracefully', async () => {
      // Disconnect and reconnect to test error handling
      clientSocket.disconnect();
      
      await new Promise<void>((resolve) => {
        clientSocket.on('disconnect', () => resolve());
      });

      expect(clientSocket.connected).toBe(false);
    });
  });

  describe('Real-time Chat', () => {
    it('should join chat room successfully', async () => {
      const roomData = {
        jobId: testJob.id,
        userId: testUser.id
      };

      // Join chat room
      clientSocket.emit('join_chat_room', roomData);

      // Wait for room join confirmation
      const joinResponse = await new Promise((resolve) => {
        clientSocket.on('joined_chat_room', resolve);
        clientSocket.on('join_error', resolve);
      });

      expect(joinResponse).toBeDefined();
      expect(joinResponse.roomId).toBe(`chat_${testJob.id}`);
    });

    it('should send and receive chat messages', async () => {
      const messageData = {
        jobId: testJob.id,
        senderId: testUser.id,
        text: 'Hello, this is a test message',
        timestamp: new Date().toISOString()
      };

      // Send message
      clientSocket.emit('send_message', messageData);

      // Wait for message confirmation
      const messageResponse = await new Promise((resolve) => {
        clientSocket.on('message_sent', resolve);
        clientSocket.on('message_error', resolve);
      });

      expect(messageResponse).toBeDefined();
      expect(messageResponse.success).toBe(true);
    });

    it('should broadcast messages to room members', async () => {
      const messageData = {
        jobId: testJob.id,
        senderId: testUser.id,
        text: 'Broadcast test message',
        timestamp: new Date().toISOString()
      };

      // Send broadcast message
      clientSocket.emit('broadcast_message', messageData);

      // Wait for broadcast confirmation
      const broadcastResponse = await new Promise((resolve) => {
        clientSocket.on('message_broadcasted', resolve);
        clientSocket.on('broadcast_error', resolve);
      });

      expect(broadcastResponse).toBeDefined();
      expect(broadcastResponse.success).toBe(true);
    });

    it('should handle message delivery status', async () => {
      const messageData = {
        jobId: testJob.id,
        senderId: testUser.id,
        text: 'Message with delivery status',
        timestamp: new Date().toISOString()
      };

      // Send message with delivery tracking
      clientSocket.emit('send_message_with_status', messageData);

      // Wait for delivery status updates
      const deliveryEvents = await new Promise((resolve) => {
        const events: any[] = [];
        clientSocket.on('message_delivered', (data) => {
          events.push(data);
          if (events.length >= 2) resolve(events);
        });
        clientSocket.on('message_read', (data) => {
          events.push(data);
          if (events.length >= 2) resolve(events);
        });
      });

      expect(deliveryEvents).toHaveLength(2);
      expect(deliveryEvents.some(e => e.type === 'delivered')).toBe(true);
      expect(deliveryEvents.some(e => e.type === 'read')).toBe(true);
    });
  });

  describe('Real-time Notifications', () => {
    it('should send job notifications', async () => {
      const notificationData = {
        userId: testUser.id,
        type: 'job_proposal_received',
        title: 'New Proposal Received',
        message: 'You have received a new proposal for your job',
        data: {
          jobId: testJob.id,
          proposalId: testProposal.id
        }
      };

      // Send notification
      clientSocket.emit('send_notification', notificationData);

      // Wait for notification confirmation
      const notificationResponse = await new Promise((resolve) => {
        clientSocket.on('notification_sent', resolve);
        clientSocket.on('notification_error', resolve);
      });

      expect(notificationResponse).toBeDefined();
      expect(notificationResponse.success).toBe(true);
    });

    it('should handle notification preferences', async () => {
      const preferencesData = {
        userId: testUser.id,
        email: true,
        push: true,
        sms: false,
        inApp: true
      };

      // Update notification preferences
      clientSocket.emit('update_notification_preferences', preferencesData);

      // Wait for preferences update confirmation
      const preferencesResponse = await new Promise((resolve) => {
        clientSocket.on('preferences_updated', resolve);
        clientSocket.on('preferences_error', resolve);
      });

      expect(preferencesResponse).toBeDefined();
      expect(preferencesResponse.success).toBe(true);
    });

    it('should send bulk notifications', async () => {
      const bulkNotificationData = {
        userIds: [testUser.id, 'other-user-id'],
        type: 'system_maintenance',
        title: 'System Maintenance',
        message: 'System will be down for maintenance',
        priority: 'high'
      };

      // Send bulk notification
      clientSocket.emit('send_bulk_notification', bulkNotificationData);

      // Wait for bulk notification confirmation
      const bulkResponse = await new Promise((resolve) => {
        clientSocket.on('bulk_notification_sent', resolve);
        clientSocket.on('bulk_notification_error', resolve);
      });

      expect(bulkResponse).toBeDefined();
      expect(bulkResponse.success).toBe(true);
      expect(bulkResponse.data.recipientsCount).toBe(2);
    });
  });

  describe('Job Status Updates', () => {
    it('should broadcast job status changes', async () => {
      const statusUpdateData = {
        jobId: testJob.id,
        oldStatus: 'posted',
        newStatus: 'in_progress',
        updatedBy: testUser.id,
        timestamp: new Date().toISOString()
      };

      // Broadcast status update
      clientSocket.emit('broadcast_job_status', statusUpdateData);

      // Wait for status update confirmation
      const statusResponse = await new Promise((resolve) => {
        clientSocket.on('job_status_updated', resolve);
        clientSocket.on('status_update_error', resolve);
      });

      expect(statusResponse).toBeDefined();
      expect(statusResponse.success).toBe(true);
      expect(statusResponse.data.newStatus).toBe('in_progress');
    });

    it('should notify relevant users of job changes', async () => {
      const jobChangeData = {
        jobId: testJob.id,
        changeType: 'proposal_accepted',
        changedBy: testUser.id,
        affectedUsers: ['test-freelancer-id'],
        timestamp: new Date().toISOString()
      };

      // Notify users of job change
      clientSocket.emit('notify_job_change', jobChangeData);

      // Wait for notification confirmation
      const changeResponse = await new Promise((resolve) => {
        clientSocket.on('job_change_notified', resolve);
        clientSocket.on('change_notification_error', resolve);
      });

      expect(changeResponse).toBeDefined();
      expect(changeResponse.success).toBe(true);
      expect(changeResponse.data.notifiedUsers).toContain('test-freelancer-id');
    });
  });

  describe('Payment Notifications', () => {
    it('should notify payment success', async () => {
      const paymentData = {
        jobId: testJob.id,
        proposalId: testProposal.id,
        amount: 500,
        currency: 'usd',
        paymentMethod: 'stripe',
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      // Send payment success notification
      clientSocket.emit('payment_success', paymentData);

      // Wait for payment notification confirmation
      const paymentResponse = await new Promise((resolve) => {
        clientSocket.on('payment_notified', resolve);
        clientSocket.on('payment_notification_error', resolve);
      });

      expect(paymentResponse).toBeDefined();
      expect(paymentResponse.success).toBe(true);
      expect(paymentResponse.data.status).toBe('completed');
    });

    it('should handle payment disputes', async () => {
      const disputeData = {
        jobId: testJob.id,
        proposalId: testProposal.id,
        reason: 'Work quality issues',
        raisedBy: testUser.id,
        timestamp: new Date().toISOString()
      };

      // Raise payment dispute
      clientSocket.emit('raise_payment_dispute', disputeData);

      // Wait for dispute notification confirmation
      const disputeResponse = await new Promise((resolve) => {
        clientSocket.on('dispute_raised', resolve);
        clientSocket.on('dispute_error', resolve);
      });

      expect(disputeResponse).toBeDefined();
      expect(disputeResponse.success).toBe(true);
      expect(disputeResponse.data.reason).toBe('Work quality issues');
    });
  });

  describe('User Presence and Activity', () => {
    it('should track user online status', async () => {
      const presenceData = {
        userId: testUser.id,
        status: 'online',
        lastSeen: new Date().toISOString()
      };

      // Update user presence
      clientSocket.emit('update_presence', presenceData);

      // Wait for presence update confirmation
      const presenceResponse = await new Promise((resolve) => {
        clientSocket.on('presence_updated', resolve);
        clientSocket.on('presence_error', resolve);
      });

      expect(presenceResponse).toBeDefined();
      expect(presenceResponse.success).toBe(true);
      expect(presenceResponse.data.status).toBe('online');
    });

    it('should handle user typing indicators', async () => {
      const typingData = {
        jobId: testJob.id,
        userId: testUser.id,
        isTyping: true
      };

      // Send typing indicator
      clientSocket.emit('typing_indicator', typingData);

      // Wait for typing indicator confirmation
      const typingResponse = await new Promise((resolve) => {
        clientSocket.on('typing_updated', resolve);
        clientSocket.on('typing_error', resolve);
      });

      expect(typingResponse).toBeDefined();
      expect(typingResponse.success).toBe(true);
      expect(typingResponse.data.isTyping).toBe(true);
    });

    it('should track user activity', async () => {
      const activityData = {
        userId: testUser.id,
        action: 'viewed_job',
        targetId: testJob.id,
        timestamp: new Date().toISOString()
      };

      // Track user activity
      clientSocket.emit('track_activity', activityData);

      // Wait for activity tracking confirmation
      const activityResponse = await new Promise((resolve) => {
        clientSocket.on('activity_tracked', resolve);
        clientSocket.on('activity_error', resolve);
      });

      expect(activityResponse).toBeDefined();
      expect(activityResponse.success).toBe(true);
      expect(activityResponse.data.action).toBe('viewed_job');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle socket disconnection gracefully', async () => {
      // Force disconnect
      clientSocket.disconnect();

      // Wait for disconnect event
      await new Promise<void>((resolve) => {
        clientSocket.on('disconnect', () => resolve());
      });

      expect(clientSocket.connected).toBe(false);
    });

    it('should handle message delivery failures', async () => {
      const invalidMessageData = {
        jobId: 'invalid-job-id',
        senderId: testUser.id,
        text: 'Test message'
      };

      // Send invalid message
      clientSocket.emit('send_message', invalidMessageData);

      // Wait for error response
      const errorResponse = await new Promise((resolve) => {
        clientSocket.on('message_error', resolve);
      });

      expect(errorResponse).toBeDefined();
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      // Send multiple messages rapidly to trigger rate limiting
      const messages = Array.from({ length: 10 }, (_, i) => ({
        jobId: testJob.id,
        senderId: testUser.id,
        text: `Rate limit test message ${i}`,
        timestamp: new Date().toISOString()
      }));

      // Send all messages
      messages.forEach(message => {
        clientSocket.emit('send_message', message);
      });

      // Wait for rate limit error
      const rateLimitResponse = await new Promise((resolve) => {
        clientSocket.on('rate_limit_exceeded', resolve);
        clientSocket.on('message_error', resolve);
      });

      expect(rateLimitResponse).toBeDefined();
      expect(rateLimitResponse.success).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent connections', async () => {
      const connections: any[] = [];
      const connectionCount = 10;

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const port = httpServer.address().port;
        const socket = Client(`http://localhost:${port}`);
        
        await new Promise<void>((resolve) => {
          socket.on('connect', () => resolve());
        });
        
        connections.push(socket);
      }

      // Verify all connections are active
      expect(connections.every(socket => socket.connected)).toBe(true);
      expect(connections).toHaveLength(connectionCount);

      // Cleanup connections
      connections.forEach(socket => socket.disconnect());
    });

    it('should handle large message payloads', async () => {
      const largeMessageData = {
        jobId: testJob.id,
        senderId: testUser.id,
        text: 'A'.repeat(10000), // 10KB message
        timestamp: new Date().toISOString()
      };

      // Send large message
      clientSocket.emit('send_message', largeMessageData);

      // Wait for message confirmation
      const messageResponse = await new Promise((resolve) => {
        clientSocket.on('message_sent', resolve);
        clientSocket.on('message_error', resolve);
      });

      expect(messageResponse).toBeDefined();
      expect(messageResponse.success).toBe(true);
    });

    it('should handle rapid message sending', async () => {
      const messageCount = 50;
      const messages: any[] = [];

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        const messageData = {
          jobId: testJob.id,
          senderId: testUser.id,
          text: `Rapid message ${i}`,
          timestamp: new Date().toISOString()
        };

        clientSocket.emit('send_message', messageData);
        messages.push(messageData);
      }

      // Wait for all message confirmations
      const messageResponses = await new Promise((resolve) => {
        const responses: any[] = [];
        clientSocket.on('message_sent', (response) => {
          responses.push(response);
          if (responses.length >= messageCount) resolve(responses);
        });
      });

      expect(messageResponses).toHaveLength(messageCount);
      expect(messageResponses.every(r => r.success)).toBe(true);
    });
  });
});
