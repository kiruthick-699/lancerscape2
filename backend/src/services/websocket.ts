import { Server } from 'socket.io';
import { logger } from '../utils/logger';

export const initializeWebSocket = (server: any) => {
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(o => o.length > 0);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : (process.env.FRONTEND_URL || 'http://localhost:3000'),
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.id}`);
    });
  });

  return io;
}; 