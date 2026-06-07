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

const productionFrontendOrigins = new Set([
  'https://trickmaster.netlify.app',
  'https://cards-frontend-mw09.onrender.com',
]);
const renderFrontendOrigin = /^https:\/\/[\w-]*frontend[\w-]*\.onrender\.com$/;

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (env.frontendUrls.includes(origin)) return true;
  if (productionFrontendOrigins.has(origin)) return true;
  if (env.isDev && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  return renderFrontendOrigin.test(origin);
}

const corsOrigin = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin not allowed: ${origin}`), false);
};

// Socket.IO server
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ service: 'cards-backend', status: 'ok' });
});

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
    logger.info(`🌍 CORS origins: ${env.frontendUrls.join(', ')}`);
  });
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

export { app, server, io };
