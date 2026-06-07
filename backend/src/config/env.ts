import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isDev = nodeEnv === 'development';
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cards_game';
const databaseSsl =
  process.env.DATABASE_SSL === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  databaseUrl.includes('sslmode=require');
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const frontendUrls = frontendUrl
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

if (!isDev) {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.JWT_SECRET || jwtSecret === 'dev-secret') missing.push('JWT_SECRET');
  if (!googleClientId) missing.push('GOOGLE_CLIENT_ID');

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  databaseUrl,
  databaseSsl,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleClientId,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  frontendUrl,
  frontendUrls,
  isDev,
};
