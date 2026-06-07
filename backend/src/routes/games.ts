import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getGameDetails, getLeaderboard } from '../db/queries/games';

const router = Router();

router.get('/leaderboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const game = await getGameDetails(req.params.id as string);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json({ game });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get game details' });
  }
});

export default router;
