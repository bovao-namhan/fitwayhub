import { Router } from 'express';
import {
  getStepsHistory,
  getStepsByDate,
  addSteps,
  getWeeklyStats,
  getMonthlyStats,
  deleteSteps
} from '../controllers/stepsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all steps history
router.get('/history', authenticateToken, getStepsHistory);

// Get weekly stats
router.get('/stats/weekly', authenticateToken, getWeeklyStats);

// Get monthly stats
router.get('/stats/monthly', authenticateToken, getMonthlyStats);

// Get steps for specific date
router.get('/:date', authenticateToken, getStepsByDate);

// Add or update steps
router.post('/add', authenticateToken, addSteps);

// Delete steps for a date

import { get as dbGet, run as dbRun } from '../config/database';

// ── Points: Step goal completed ───────────────────────────────────────────────
router.post('/goal-completed', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const already = await dbGet('SELECT id FROM point_transactions WHERE user_id = ? AND reference_type = ? AND DATE(created_at) = ?', [userId, 'goal_complete', today]);
    if (already) return res.json({ message: 'Already awarded today', points: 0 });
    await dbRun('UPDATE users SET points = points + 2 WHERE id = ?', [userId]);
    await dbRun('INSERT INTO point_transactions (user_id, points, reason, reference_type) VALUES (?,?,?,?)', [userId, 2, 'Completed daily step goal', 'goal_complete']);
    const user = await dbGet<any>('SELECT points FROM users WHERE id = ?', [userId]);
    res.json({ message: '+2 points for completing your goal!', points: user?.points || 0 });
  } catch (err) { res.status(500).json({ message: 'Failed to award points' }); }
});

export default router;
