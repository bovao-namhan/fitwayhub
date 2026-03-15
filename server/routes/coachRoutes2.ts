import { Router, Request, Response } from 'express';
import { authenticateToken, requireActiveCoachMembershipForDeals } from '../middleware/auth';
import { upload, uploadVideo, optimizeImage, validateVideoSize, uploadToR2 } from '../middleware/upload';
import { get, run, query } from '../config/database';

const router = Router();

const coachOrAdmin = (req: any, res: Response, next: any) => {
  if (req.user?.role !== 'coach' && req.user?.role !== 'admin') return res.status(403).json({ message: 'Coach access required' });
  next();
};

// ── Public active ads (for user dashboard/home) ───────────────────────────────
router.get('/ads/public', authenticateToken, async (_req: any, res: Response) => {
  try {
    // Auto-expire ads past their boost_end
    await run("UPDATE coach_ads SET status = 'expired' WHERE status = 'active' AND boost_end IS NOT NULL AND boost_end < NOW()");
    const ads = await query(
      `SELECT a.*, u.name as coach_name, u.avatar as coach_avatar, u.email as coach_email
       FROM coach_ads a LEFT JOIN users u ON a.coach_id = u.id
       WHERE a.status = 'active' ORDER BY a.created_at DESC`
    );
    res.json({ ads });
  } catch { res.status(500).json({ message: 'Failed to fetch ads' }); }
});

// ── Coach: get own ads ────────────────────────────────────────────────────────
router.get('/ads', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  try {
    // Auto-expire
    await run("UPDATE coach_ads SET status = 'expired' WHERE status = 'active' AND boost_end IS NOT NULL AND boost_end < NOW() AND coach_id = ?", [req.user.id]);
    const ads = await query(
      `SELECT a.*, COALESCE(ap.amount, 0) as paid_amount, COALESCE(ap.duration_minutes, 0) as paid_minutes,
              ap.status as payment_status, ap.proof_url as payment_proof
       FROM coach_ads a
       LEFT JOIN ad_payments ap ON ap.ad_id = a.id
       WHERE a.coach_id = ? ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json({ ads });
  } catch { res.status(500).json({ message: 'Failed to fetch ads' }); }
});

// ── Coach: create ad (with optional image upload) ────────────────────────────
router.post('/ads', authenticateToken, coachOrAdmin, requireActiveCoachMembershipForDeals, uploadVideo.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), validateVideoSize, optimizeImage(), async (req: any, res: Response) => {
  const { title, description, specialty, cta, highlight, paymentMethod, ad_type, media_type, objective, duration_hours, duration_days } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'Title and description required' });
  try {
    const files = req.files as { [f: string]: Express.Multer.File[] };
    const imageUrl = files?.image?.[0] ? await uploadToR2(files.image[0], 'ads') : null;
    const videoUrl = files?.video?.[0] ? await uploadToR2(files.video[0], 'ads') : null;
    const totalMinutes = (parseInt(duration_hours || '0') * 60) + (parseInt(duration_days || '0') * 24 * 60);
    const { insertId } = await run(
      'INSERT INTO coach_ads (coach_id, title, description, specialty, cta, highlight, image_url, video_url, payment_method, ad_type, media_type, objective, duration_hours, duration_days) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [req.user.id, title, description, specialty || '', cta || 'Book Free Consultation', highlight || '', imageUrl, videoUrl, paymentMethod || 'ewallet', ad_type || 'community', media_type || 'image', objective || 'coaching', parseInt(duration_hours || '0'), parseInt(duration_days || '0')]
    );
    const ad = await get('SELECT * FROM coach_ads WHERE id = ?', [insertId]);
    res.json({ ad, message: 'Ad submitted for review' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to create ad' }); }
});

// ── Coach: update ad ─────────────────────────────────────────────────────────
router.put('/ads/:id', authenticateToken, coachOrAdmin, requireActiveCoachMembershipForDeals, uploadVideo.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), validateVideoSize, optimizeImage(), async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, description, specialty, cta, highlight, paymentMethod, ad_type, media_type, objective, duration_hours, duration_days } = req.body;
  try {
    const existing = await get<any>('SELECT * FROM coach_ads WHERE id = ? AND coach_id = ?', [id, req.user.id]);
    if (!existing) return res.status(404).json({ message: 'Ad not found' });
    const files = req.files as { [f: string]: Express.Multer.File[] };
    const imageUrl = files?.image?.[0] ? await uploadToR2(files.image[0], 'ads') : existing.image_url;
    const videoUrl = files?.video?.[0] ? await uploadToR2(files.video[0], 'ads') : existing.video_url;
    await run(
      "UPDATE coach_ads SET title=?, description=?, specialty=?, cta=?, highlight=?, image_url=?, video_url=?, payment_method=?, ad_type=?, media_type=?, objective=?, duration_hours=?, duration_days=?, status='pending', updated_at=NOW() WHERE id=?",
      [title, description, specialty, cta, highlight, imageUrl, videoUrl, paymentMethod || 'ewallet', ad_type || existing.ad_type, media_type || existing.media_type, objective || existing.objective, parseInt(duration_hours || existing.duration_hours || '0'), parseInt(duration_days || existing.duration_days || '0'), id]
    );
    res.json({ message: 'Ad updated, pending review' });
  } catch { res.status(500).json({ message: 'Failed to update ad' }); }
});

// ── Coach: delete ad ─────────────────────────────────────────────────────────
router.delete('/ads/:id', authenticateToken, coachOrAdmin, requireActiveCoachMembershipForDeals, async (req: any, res: Response) => {
  try {
    const existing = await get('SELECT id FROM coach_ads WHERE id = ? AND coach_id = ?', [req.params.id, req.user.id]);
    if (!existing) return res.status(404).json({ message: 'Ad not found' });
    await run('DELETE FROM coach_ads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ad deleted' });
  } catch { res.status(500).json({ message: 'Failed to delete ad' }); }
});

// ── Coach: list subscribed users ──────────────────────────────────────────────
router.get('/users', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  try {
    const users = await query(
      `SELECT DISTINCT u.id, u.name, u.email, u.avatar, u.is_premium, u.points, u.steps, u.height, u.weight
       FROM users u
       INNER JOIN coach_subscriptions cs ON cs.user_id = u.id
       WHERE cs.coach_id = ? AND cs.status = 'active' AND (cs.expires_at IS NULL OR cs.expires_at > NOW())
       ORDER BY u.name ASC`,
      [req.user.id]
    );
    res.json({ users });
  } catch { res.status(500).json({ message: 'Failed to fetch users' }); }
});

// ── Coach: get user profile by id ────────────────────────────────────────────
router.get('/users/:id/profile', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  try {
    const user = await get<any>('SELECT id, name, email, avatar, height, weight, gender, age, is_premium, points, steps, step_goal FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch { res.status(500).json({ message: 'Failed to fetch user' }); }
});

router.get('/users/:id/workout-plan', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  const plan: any = await get('SELECT * FROM workout_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.params.id]);
  if (plan) { try { plan.exercises = typeof plan.exercises === 'string' ? JSON.parse(plan.exercises) : plan.exercises || []; } catch { plan.exercises = []; } }
  res.json({ plan: plan || null });
});

router.post('/users/:id/workout-plan', authenticateToken, coachOrAdmin, requireActiveCoachMembershipForDeals, async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, description, days_per_week, exercises } = req.body;
  const exercisesJson = JSON.stringify(exercises || []);
  const existing = await get('SELECT id FROM workout_plans WHERE user_id = ?', [id]);
  if (existing) {
    await run('UPDATE workout_plans SET title=?, description=?, days_per_week=?, exercises=?, coach_id=? WHERE user_id=?', [title, description, days_per_week, exercisesJson, req.user.id, id]);
  } else {
    await run('INSERT INTO workout_plans (user_id, coach_id, title, description, days_per_week, exercises) VALUES (?,?,?,?,?,?)', [id, req.user.id, title, description, days_per_week, exercisesJson]);
  }
  res.json({ message: 'Workout plan saved' });
});

router.get('/users/:id/nutrition-plan', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  const plan: any = await get('SELECT * FROM nutrition_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [req.params.id]);
  if (plan) { try { plan.meals = typeof plan.meals === 'string' ? JSON.parse(plan.meals) : plan.meals || []; } catch { plan.meals = []; } }
  res.json({ plan: plan || null });
});

router.post('/users/:id/nutrition-plan', authenticateToken, coachOrAdmin, requireActiveCoachMembershipForDeals, async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, daily_calories, protein_g, carbs_g, fat_g, meals, notes } = req.body;
  const mealsJson = JSON.stringify(meals || []);
  const existing = await get('SELECT id FROM nutrition_plans WHERE user_id = ?', [id]);
  if (existing) {
    await run('UPDATE nutrition_plans SET title=?, daily_calories=?, protein_g=?, carbs_g=?, fat_g=?, meals=?, notes=?, coach_id=? WHERE user_id=?', [title, daily_calories, protein_g, carbs_g, fat_g, mealsJson, notes, req.user.id, id]);
  } else {
    await run('INSERT INTO nutrition_plans (user_id, coach_id, title, daily_calories, protein_g, carbs_g, fat_g, meals, notes) VALUES (?,?,?,?,?,?,?,?,?)', [id, req.user.id, title, daily_calories, protein_g, carbs_g, fat_g, mealsJson, notes]);
  }
  res.json({ message: 'Nutrition plan saved' });
});

// ── Coach: set athlete step goal ─────────────────────────────────────────────
router.patch('/users/:id/step-goal', authenticateToken, coachOrAdmin, requireActiveCoachMembershipForDeals, async (req: any, res: Response) => {
  const { id } = req.params;
  const { step_goal } = req.body;
  if (!step_goal || step_goal < 100) return res.status(400).json({ message: 'Invalid step goal' });
  try {
    await run('UPDATE users SET step_goal = ? WHERE id = ?', [step_goal, id]);
    res.json({ success: true, step_goal, message: 'Step goal updated' });
  } catch { res.status(500).json({ message: 'Failed to update step goal' }); }
});

// ── Ad click tracking ────────────────────────────────────────────────────────
router.post('/ads/:id/click', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('UPDATE coach_ads SET clicks = clicks + 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ message: 'Failed to track click' }); }
});

// ── Ad impression tracking ───────────────────────────────────────────────────
router.post('/ads/:id/impression', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('UPDATE coach_ads SET impressions = impressions + 1 WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ message: 'Failed to track impression' }); }
});

// ── Batch impression tracking (multiple ads at once) ─────────────────────────
router.post('/ads/impressions', authenticateToken, async (req: any, res: Response) => {
  try {
    const { ids } = req.body;
    if (Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      await run(`UPDATE coach_ads SET impressions = impressions + 1 WHERE id IN (${placeholders})`, ids);
    }
    res.json({ ok: true });
  } catch { res.status(500).json({ message: 'Failed to track impressions' }); }
});


// ── Coach: real-time dashboard stats ─────────────────────────────────────────
router.get('/stats', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  try {
    const coachId = req.user.id;
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;

    const [athleteRow]: any = await query(
      "SELECT COUNT(DISTINCT user_id) as cnt FROM coaching_bookings WHERE coach_id = ?", [coachId]);
    const [pendingRow]: any = await query(
      "SELECT COUNT(*) as cnt FROM coaching_bookings WHERE coach_id = ? AND status = 'pending'", [coachId]);
    const [revenueRow]: any = await query(
      "SELECT IFNULL(SUM(amount),0) as total FROM coaching_bookings WHERE coach_id = ? AND status = 'accepted' AND created_at >= ?", [coachId, monthStart]);
    const [ratingRow]: any = await query(
      "SELECT IFNULL(AVG(rating),0) as avg, COUNT(*) as cnt FROM coach_reviews WHERE coach_id = ?", [coachId]);
    const [weekSessionsRow]: any = await query(
      "SELECT COUNT(*) as cnt FROM coaching_bookings WHERE coach_id = ? AND status = 'accepted' AND date >= ?", [coachId, weekStartStr]);
    const [totalRow]: any = await query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted FROM coaching_bookings WHERE coach_id = ?", [coachId]);

    const completionRate = totalRow?.total > 0 ? Math.round((totalRow.accepted / totalRow.total) * 100) : 0;

    // Weekly sessions chart (last 7 days)
    const weeklyRows = await query(
      "SELECT date, COUNT(*) as sessions, IFNULL(SUM(amount),0) as revenue FROM coaching_bookings WHERE coach_id = ? AND status = 'accepted' AND date >= ? GROUP BY date ORDER BY date ASC",
      [coachId, weekStartStr]
    ) as any[];
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const weeklyMap: Record<string, any> = {};
    weeklyRows.forEach((r: any) => { weeklyMap[r.date] = r; });
    const weekly = Array.from({length: 7}).map((_, i) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      return { day: days[d.getDay()], sessions: weeklyMap[dateStr]?.sessions || 0, revenue: weeklyMap[dateStr]?.revenue || 0 };
    });

    res.json({
      athletes: athleteRow?.cnt || 0,
      pendingRequests: pendingRow?.cnt || 0,
      monthlyRevenue: revenueRow?.total || 0,
      avgRating: parseFloat((ratingRow?.avg || 0).toFixed(1)),
      reviewCount: ratingRow?.cnt || 0,
      sessionsThisWeek: weekSessionsRow?.cnt || 0,
      completionRate,
      weekly,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to fetch stats' }); }
});

// ── Coach: upcoming sessions ──────────────────────────────────────────────────
router.get('/upcoming-sessions', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  try {
    const coachId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const sessions = await query(
      `SELECT cb.*, u.name as athlete_name, u.avatar as athlete_avatar
       FROM coaching_bookings cb
       LEFT JOIN users u ON cb.user_id = u.id
       WHERE cb.coach_id = ? AND cb.status IN ('accepted','pending') AND (cb.date >= ? OR cb.date = '' OR cb.date IS NULL)
       ORDER BY cb.date ASC, cb.time ASC LIMIT 10`,
      [coachId, today]
    );
    res.json({ sessions });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch sessions' }); }
});

// ── Coach: recent activity feed ───────────────────────────────────────────────
router.get('/activity', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  try {
    const coachId = req.user.id;

    // Recent bookings
    const bookings = await query(
      `SELECT 'booking' as type, cb.id, cb.status, cb.created_at, u.name as actor_name, u.avatar as actor_avatar
       FROM coaching_bookings cb LEFT JOIN users u ON cb.user_id = u.id
       WHERE cb.coach_id = ? ORDER BY cb.created_at DESC LIMIT 5`, [coachId]) as any[];

    // Recent messages from athletes
    const msgs = await query(
      `SELECT 'message' as type, m.id, m.content, m.created_at, u.name as actor_name, u.avatar as actor_avatar
       FROM messages m LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.receiver_id = ? AND m.sender_id != ? ORDER BY m.created_at DESC LIMIT 5`,
      [coachId, coachId]) as any[];

    // Recent reviews
    const reviews = await query(
      `SELECT 'review' as type, r.id, r.rating, r.text, r.created_at, u.name as actor_name, u.avatar as actor_avatar
       FROM coach_reviews r LEFT JOIN users u ON r.user_id = u.id
       WHERE r.coach_id = ? ORDER BY r.created_at DESC LIMIT 5`, [coachId]) as any[];

    // Merge and sort by date
    const all = [...bookings, ...msgs, ...reviews].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 10);

    res.json({ activity: all });
  } catch (err) { res.status(500).json({ message: 'Failed to fetch activity' }); }
});

// ── User/Coach: notifications ─────────────────────────────────────────────────
router.get('/notifications', authenticateToken, async (req: any, res: Response) => {
  try {
    const notifs = await query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json({ notifications: notifs });
  } catch { res.status(500).json({ message: 'Failed to fetch notifications' }); }
});

router.patch('/notifications/:id/read', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ message: 'Failed to mark read' }); }
});

router.post('/notifications/read-all', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ message: 'Failed to mark all read' }); }
});


// ── Coach: Ad Payment (4 EGP per minute boost) ───────────────────────────────
router.post('/ads/:id/payment', authenticateToken, coachOrAdmin, requireActiveCoachMembershipForDeals, async (req: any, res: Response) => {
  const { id } = req.params;
  const { duration_minutes, payment_method, proof_url, phone, card_last4 } = req.body;
  if (!duration_minutes || duration_minutes < 1) return res.status(400).json({ message: 'Duration must be at least 1 minute' });
  const RATE_PER_MINUTE = 4; // 4 EGP per minute
  const amount = parseFloat((duration_minutes * RATE_PER_MINUTE).toFixed(2));
  try {
    const ad = await get<any>('SELECT id, coach_id FROM coach_ads WHERE id = ? AND coach_id = ?', [id, req.user.id]);
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    // Upsert payment record
    const existing = await get('SELECT id FROM ad_payments WHERE ad_id = ?', [id]);
    if (existing) {
      await run('UPDATE ad_payments SET duration_minutes=?, amount=?, payment_method=?, proof_url=?, phone=?, card_last4=?, status=?, updated_at=NOW() WHERE ad_id=?',
        [duration_minutes, amount, payment_method || 'ewallet', proof_url || null, phone || null, card_last4 || null, 'pending', id]);
    } else {
      await run('INSERT INTO ad_payments (ad_id, coach_id, duration_minutes, amount, payment_method, proof_url, phone, card_last4, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [id, req.user.id, duration_minutes, amount, payment_method || 'ewallet', proof_url || null, phone || null, card_last4 || null, 'pending']);
    }
    await run("UPDATE coach_ads SET status='pending', updated_at=NOW() WHERE id=?", [id]);
    res.json({ message: 'Payment submitted, awaiting admin approval', amount, duration_minutes });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to submit payment' }); }
});

// ── Coach: Get ad payment info ────────────────────────────────────────────────
router.get('/ads/:id/payment', authenticateToken, coachOrAdmin, async (req: any, res: Response) => {
  try {
    const payment = await get('SELECT * FROM ad_payments WHERE ad_id = ?', [req.params.id]);
    res.json({ payment: payment || null });
  } catch { res.status(500).json({ message: 'Failed to fetch payment' }); }
});

export default router;

// ── Coach Follow / Unfollow ────────────────────────────────────────────────────
router.post('/follow/:coachId', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('INSERT IGNORE INTO coach_follows (follower_id, coach_id) VALUES (?,?)', [req.user.id, req.params.coachId]);
    res.json({ following: true });
  } catch { res.status(500).json({ message: 'Failed to follow coach' }); }
});

router.delete('/follow/:coachId', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('DELETE FROM coach_follows WHERE follower_id=? AND coach_id=?', [req.user.id, req.params.coachId]);
    res.json({ following: false });
  } catch { res.status(500).json({ message: 'Failed to unfollow coach' }); }
});

router.get('/follow/:coachId/status', authenticateToken, async (req: any, res: Response) => {
  try {
    const row = await get('SELECT id FROM coach_follows WHERE follower_id=? AND coach_id=?', [req.user.id, req.params.coachId]);
    res.json({ following: !!row });
  } catch { res.status(500).json({ message: 'Failed to check follow status' }); }
});

router.get('/following', authenticateToken, async (req: any, res: Response) => {
  try {
    const coaches = await query(`SELECT u.id, u.name, u.avatar, u.email, cp.specialty, cp.bio
      FROM coach_follows cf JOIN users u ON cf.coach_id = u.id
      LEFT JOIN coach_profiles cp ON cp.coach_id = u.id
      WHERE cf.follower_id = ? ORDER BY cf.created_at DESC`, [req.user.id]);
    res.json({ coaches });
  } catch { res.status(500).json({ message: 'Failed to fetch following' }); }
});

// ── Coach posts (for profile page) ───────────────────────────────────────────
router.get('/profile/:coachId/posts', authenticateToken, async (req: any, res: Response) => {
  try {
    const posts = await query(`
      SELECT p.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes,
             (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
      FROM posts p JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 30`, [req.params.coachId]);
    res.json({ posts });
  } catch { res.status(500).json({ message: 'Failed to fetch coach posts' }); }
});

// ── Coach profile stats ───────────────────────────────────────────────────────
router.get('/profile/:coachId/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const coachId = req.params.coachId;
    const [followRow]: any = await query('SELECT COUNT(*) as cnt FROM coach_follows WHERE coach_id=?', [coachId]);
    const [postRow]: any = await query('SELECT COUNT(*) as cnt FROM posts WHERE user_id=?', [coachId]);
    const [athleteRow]: any = await query("SELECT COUNT(DISTINCT user_id) as cnt FROM coaching_bookings WHERE coach_id=? AND status='accepted'", [coachId]);
    const [ratingRow]: any = await query('SELECT IFNULL(AVG(rating),0) as avg, COUNT(*) as cnt FROM coach_reviews WHERE coach_id=?', [coachId]);
    res.json({ followers: followRow?.cnt || 0, posts: postRow?.cnt || 0, athletes: athleteRow?.cnt || 0, avgRating: parseFloat((ratingRow?.avg || 0).toFixed(1)), reviewCount: ratingRow?.cnt || 0 });
  } catch { res.status(500).json({ message: 'Failed to fetch coach stats' }); }
});

// ── Coach profile: videos (non-shorts) ───────────────────────────────────────
router.get('/profile/:coachId/videos', authenticateToken, async (req: any, res: Response) => {
  try {
    const videos = await query(
      'SELECT id, title, description, url, thumbnail, duration, duration_seconds, category, is_premium FROM workout_videos WHERE coach_id = ? AND (is_short IS NULL OR is_short = 0) ORDER BY created_at DESC LIMIT 30',
      [req.params.coachId]
    );
    res.json({ videos });
  } catch { res.status(500).json({ message: 'Failed to fetch coach videos' }); }
});

// ── Coach profile: shorties ───────────────────────────────────────────────────
router.get('/profile/:coachId/shorties', authenticateToken, async (req: any, res: Response) => {
  try {
    const videos = await query(
      'SELECT id, title, description, url, thumbnail, duration, duration_seconds, width, height FROM workout_videos WHERE coach_id = ? AND is_short = 1 ORDER BY created_at DESC LIMIT 30',
      [req.params.coachId]
    );
    res.json({ videos });
  } catch { res.status(500).json({ message: 'Failed to fetch coach shorties' }); }
});

// ── Coach profile: photos (community posts with images) ───────────────────────
router.get('/profile/:coachId/photos', authenticateToken, async (req: any, res: Response) => {
  try {
    const photos = await query(
      `SELECT id, media_url, content, created_at FROM posts
       WHERE user_id = ? AND media_url IS NOT NULL AND media_url != ''
         AND (media_url NOT LIKE '%.mp4' AND media_url NOT LIKE '%.mov' AND media_url NOT LIKE '%.webm')
       ORDER BY created_at DESC LIMIT 50`,
      [req.params.coachId]
    );
    res.json({ photos });
  } catch { res.status(500).json({ message: 'Failed to fetch coach photos' }); }
});

// ── Public ads: include community and home_banner types ───────────────────────
router.get('/ads/public/home', authenticateToken, async (_req: any, res: Response) => {
  try {
    await run("UPDATE coach_ads SET status = 'expired' WHERE status = 'active' AND boost_end IS NOT NULL AND boost_end < NOW()");
    const ads = await query(`SELECT a.*, u.name as coach_name, u.avatar as coach_avatar, u.email as coach_email
       FROM coach_ads a LEFT JOIN users u ON a.coach_id = u.id
       WHERE a.status = 'active' AND a.ad_type = 'home_banner'
       ORDER BY a.created_at DESC LIMIT 5`);
    res.json({ ads });
  } catch { res.status(500).json({ message: 'Failed to fetch home ads' }); }
});

router.get('/ads/public/community', authenticateToken, async (_req: any, res: Response) => {
  try {
    await run("UPDATE coach_ads SET status = 'expired' WHERE status = 'active' AND boost_end IS NOT NULL AND boost_end < NOW()");
    const ads = await query(`SELECT a.*, u.name as coach_name, u.avatar as coach_avatar, u.email as coach_email
       FROM coach_ads a LEFT JOIN users u ON a.coach_id = u.id
       WHERE a.status = 'active' AND a.ad_type = 'community'
       ORDER BY a.created_at DESC LIMIT 5`);
    res.json({ ads });
  } catch { res.status(500).json({ message: 'Failed to fetch community ads' }); }
});
