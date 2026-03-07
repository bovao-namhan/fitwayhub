import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { get, query, run } from '../config/database';

const router = Router();

router.get('/videos', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await get<any>('SELECT is_premium FROM users WHERE id = ?', [req.user.id]);
    const isPremium = Boolean(user?.is_premium);
    const videos = isPremium
      ? await query('SELECT * FROM workout_videos ORDER BY created_at DESC')
      : await query('SELECT * FROM workout_videos WHERE is_premium = 0 ORDER BY created_at DESC');
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
});

router.get('/my-plan', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const workoutPlan: any = await get('SELECT * FROM workout_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    const nutritionPlan: any = await get('SELECT * FROM nutrition_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
    if (!workoutPlan && !nutritionPlan) return res.json(null);
    res.json({
      workout: workoutPlan ? {
        title: workoutPlan.title,
        description: workoutPlan.description,
        sessions: typeof workoutPlan.exercises === 'string' ? JSON.parse(workoutPlan.exercises || '[]') : (workoutPlan.exercises || []),
      } : null,
      nutrition: nutritionPlan ? {
        title: nutritionPlan.title,
        dailyCalories: nutritionPlan.daily_calories,
        protein: nutritionPlan.protein_g,
        carbs: nutritionPlan.carbs_g,
        fat: nutritionPlan.fat_g,
        meals: typeof nutritionPlan.meals === 'string' ? JSON.parse(nutritionPlan.meals || '[]') : (nutritionPlan.meals || []),
        notes: nutritionPlan.notes,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Could not fetch plan' });
  }
});

export default router;

// ── Points: Video watched ─────────────────────────────────────────────────────
router.post('/videos/:id/watched', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const videoId = req.params.id;
    // Check not already awarded today
    const today = new Date().toISOString().split('T')[0];
    const already = await get('SELECT id FROM point_transactions WHERE user_id = ? AND reference_type = ? AND reference_id = ? AND DATE(created_at) = ?', [userId, 'video_watch', videoId, today]);
    if (already) return res.json({ message: 'Already awarded today', points: 0 });
    await run('UPDATE users SET points = points + 2 WHERE id = ?', [userId]);
    await run('INSERT INTO point_transactions (user_id, points, reason, reference_type, reference_id) VALUES (?,?,?,?,?)', [userId, 2, 'Watched a full workout video', 'video_watch', videoId]);
    const user = await get<any>('SELECT points FROM users WHERE id = ?', [userId]);
    res.json({ message: '+2 points for watching video!', points: user?.points || 0 });
  } catch (err) { res.status(500).json({ message: 'Failed to award points' }); }
});
