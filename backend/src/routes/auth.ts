import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { createUser } from '../db/queries/users';
import { generateToken } from '../middleware/auth';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const googleClient = new OAuth2Client(env.googleClientId);

/**
 * POST /auth/google
 * Exchange Google OAuth credential (ID token) for a JWT.
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    if (!env.googleClientId) {
      res.status(503).json({ error: 'Google OAuth is not configured' });
      return;
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    // Create or update user
    const user = await createUser(
      payload.sub,
      payload.name || 'Unknown',
      payload.email || '',
      payload.picture || ''
    );

    // Generate JWT
    const token = generateToken(user.id, user.email);

    logger.info(`User logged in: ${user.name} (${user.email})`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        gamesPlayed: user.games_played,
        gamesWon: user.games_won,
        highestScore: user.highest_score,
        totalPoints: user.total_points,
        displayNameConfirmed: user.display_name_confirmed,
      },
    });
  } catch (error: any) {
    logger.error('Auth error:', error);

    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      res.status(503).json({ error: 'Database unavailable. Start PostgreSQL or set DATABASE_URL to a reachable Postgres database.' });
      return;
    }

    if (error?.message?.includes('Wrong recipient') || error?.message?.includes('Invalid token')) {
      res.status(401).json({ error: 'Google credential could not be verified for this OAuth client.' });
      return;
    }

    res.status(500).json({ error: 'Authentication failed. Check backend logs for details.' });
  }
});

/**
 * GET /auth/me
 * Get current user from JWT.
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let userById = null;
    try {
      const { findUserById } = await import('../db/queries/users');
      userById = await findUserById(req.userId!);
    } catch (dbError) {
      // Database query failed
    }

    if (!userById) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: userById.id,
        name: userById.name,
        email: userById.email,
        avatar: userById.avatar,
        gamesPlayed: userById.games_played,
        gamesWon: userById.games_won,
        highestScore: userById.highest_score,
        totalPoints: userById.total_points,
        displayNameConfirmed: userById.display_name_confirmed,
      },
    });
  } catch (error: any) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
