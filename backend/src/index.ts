import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { env } from './config/env';
import { testConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './socket/socketHandler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import gameRoutes from './routes/games';
import { logger } from './utils/logger';

const app = express();
const server = http.createServer(app);

// Socket.IO server
const io = new Server(server, {
  cors: {
    origin: env.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/games', gameRoutes);

// Error handler
app.use(errorHandler);

// Socket.IO handlers
setupSocketHandlers(io);

// Start server
async function start() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    if (!env.isDev) {
      throw new Error('Database connection is required outside development');
    }
    logger.warn('Database not connected. Development server is running without persistence.');
  }

  server.listen(env.port, () => {
    logger.info(`🚀 Server running on port ${env.port}`);
    logger.info(`📡 WebSocket ready`);
    logger.info(`🌍 CORS origin: ${env.frontendUrl}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server, io };
