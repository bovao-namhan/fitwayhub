import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { get, query, run } from '../config/database';

const router = Router();

router.get('/videos', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await get<any>('SELECT is_premium FROM users WHERE id = ?', [req.user.id]);
    const isPremium = Boolean(user?.is_premium);
    const videos = isPremium
      ? await query('SELECT * FROM workout_videos WHERE (is_short IS NULL OR is_short = 0) ORDER BY created_at DESC')
      : await query('SELECT * FROM workout_videos WHERE is_premium = 0 AND (is_short IS NULL OR is_short = 0) ORDER BY created_at DESC');
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
});

// ── Shorties: short videos only ────────────────────────────────────────────────
router.get('/shorties', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await get<any>('SELECT is_premium FROM users WHERE id = ?', [req.user.id]);
    const isPremium = Boolean(user?.is_premium);
    const videos = isPremium
      ? await query('SELECT * FROM workout_videos WHERE is_short = 1 ORDER BY created_at DESC')
      : await query('SELECT * FROM workout_videos WHERE is_short = 1 AND is_premium = 0 ORDER BY created_at DESC');
    res.json({ videos });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch shorties' });
  }
});

// ── Playlists: public lists ────────────────────────────────────────────────────
router.get('/playlists', authenticateToken, async (_req: any, res: any) => {
  try {
    const playlists = await query(`
      SELECT p.*, u.name as creator_name,
             (SELECT COUNT(*) FROM playlist_videos WHERE playlist_id = p.id) as video_count
      FROM video_playlists p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.is_public = 1
      ORDER BY p.sort_order ASC, p.created_at DESC
    `);
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch playlists' });
  }
});

router.get('/playlists/:id/videos', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await get<any>('SELECT is_premium FROM users WHERE id = ?', [req.user.id]);
    const isPremium = Boolean(user?.is_premium);
    let vids;
    if (isPremium) {
      vids = await query(
        `SELECT v.*, pv.sort_order as playlist_order FROM playlist_videos pv
         JOIN workout_videos v ON v.id = pv.video_id
         WHERE pv.playlist_id = ? ORDER BY pv.sort_order ASC`, [req.params.id]);
    } else {
      vids = await query(
        `SELECT v.*, pv.sort_order as playlist_order FROM playlist_videos pv
         JOIN workout_videos v ON v.id = pv.video_id
         WHERE pv.playlist_id = ? AND v.is_premium = 0 ORDER BY pv.sort_order ASC`, [req.params.id]);
    }
    res.json({ videos: vids });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch playlist videos' });
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

// ── Points: Video watched (anti-cheat) ────────────────────────────────────────
router.post('/videos/:id/watched', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const videoId = req.params.id;
    const { watchedDuration, videoDuration, seeked, speedChanged } = req.body || {};

    // Anti-cheat validations
    if (!watchedDuration || !videoDuration) return res.status(400).json({ message: 'Missing watch data', points: 0 });
    if (seeked || speedChanged) return res.json({ message: 'Not eligible — video was seeked or speed changed', points: 0 });
    // User must have watched at least 90% of the video
    if (watchedDuration < videoDuration * 0.9) return res.json({ message: 'Video not fully watched', points: 0 });

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
