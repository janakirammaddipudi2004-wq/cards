import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getUserProfile, updateUserDisplayName } from '../db/queries/users';

const router = Router();

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getUserProfile(req.userId!);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

router.put('/profile/name', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
    const name = rawName.trim().replace(/\s+/g, ' ');

    if (name.length < 2 || name.length > 32) {
      res.status(400).json({ error: 'Name must be between 2 and 32 characters' });
      return;
    }

    if (!/^[\p{L}\p{N} ._'’-]+$/u.test(name)) {
      res.status(400).json({ error: 'Name can only use letters, numbers, spaces, and simple punctuation' });
      return;
    }

    const user = await updateUserDisplayName(req.userId!, name);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to update name' });
  }
});

router.get('/:id/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await getUserProfile(req.params.id as string);
    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
