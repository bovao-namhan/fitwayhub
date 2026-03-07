import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { get, run, query } from '../config/database';
import { uploadVideo, uploadFont, upload } from '../middleware/upload';
import bcrypt from 'bcryptjs';

const router = Router();

const adminOnly = (req: any, res: Response, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// ── Users ──────────────────────────────────────────────────────────────────────
router.get('/users', authenticateToken, adminOnly, async (_req: Request, res: Response) => {
  try {
    const users = await query('SELECT id, name, email, role, avatar, is_premium, points, steps, step_goal, height, weight, gender, medical_history, medical_file_url, membership_paid, coach_membership_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch { res.status(500).json({ message: 'Failed to fetch users' }); }
});

router.patch('/users/:id/role', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['user', 'coach', 'admin', 'moderator'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  // Premium is a user-only feature; clear it when switching to non-user roles.
  if (role === 'user') {
    await run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  } else {
    await run('UPDATE users SET role = ?, is_premium = 0 WHERE id = ?', [role, id]);
  }
  res.json({ message: 'Role updated' });
});

router.patch('/users/:id/premium', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { is_premium } = req.body;
  const target = await get<any>('SELECT role FROM users WHERE id = ?', [id]);
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.role !== 'user') return res.status(400).json({ message: 'Premium is only available for users' });
  await run('UPDATE users SET is_premium = ? WHERE id = ?', [is_premium ? 1 : 0, id]);
  res.json({ message: 'Premium status updated' });
});

router.delete('/users/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  await run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User deleted' });
});

router.post('/users/:id/add-points', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { points } = req.body;
  await run('UPDATE users SET points = points + ? WHERE id = ?', [points || 0, id]);
  res.json({ message: 'Points added' });
});

router.post('/users/:id/upload-medical', authenticateToken, adminOnly, upload.single('medical'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    const userId = Number(req.params.id);
    if (!userId) return res.status(400).json({ message: 'Invalid user id' });
    const fileUrl = `/uploads/${req.file.filename}`;
    await run('UPDATE users SET medical_file_url = ?, updated_at = NOW() WHERE id = ?', [fileUrl, userId]);
    res.json({ message: 'Medical file uploaded', file_url: fileUrl });
  } catch {
    res.status(500).json({ message: 'Failed to upload medical file' });
  }
});

router.put('/users/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const oldId = Number(req.params.id);
    if (!oldId) return res.status(400).json({ message: 'Invalid user id' });

    const existing = await get<any>('SELECT * FROM users WHERE id = ?', [oldId]);
    if (!existing) return res.status(404).json({ message: 'User not found' });

    const body = req.body || {};
    const nextId = body.id !== undefined && body.id !== null && String(body.id).trim() !== ''
      ? Number(body.id)
      : oldId;

    if (!nextId || Number.isNaN(nextId) || nextId < 1) {
      return res.status(400).json({ message: 'Invalid new ID' });
    }

    if (nextId !== oldId) {
      const idConflict = await get<any>('SELECT id FROM users WHERE id = ?', [nextId]);
      if (idConflict) return res.status(409).json({ message: 'New ID is already used by another account' });

      // Changing primary key is only safe if no relational references exist.
      const refs = await Promise.all([
        get<any>('SELECT COUNT(*) as c FROM daily_summaries WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM steps_entries WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM messages WHERE sender_id = ? OR receiver_id = ?', [oldId, oldId]),
        get<any>('SELECT COUNT(*) as c FROM posts WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM post_likes WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM post_comments WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM user_follows WHERE follower_id = ? OR following_id = ?', [oldId, oldId]),
        get<any>('SELECT COUNT(*) as c FROM challenge_participants WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM premium_sessions WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM chat_requests WHERE sender_id = ? OR receiver_id = ?', [oldId, oldId]),
        get<any>('SELECT COUNT(*) as c FROM workout_plans WHERE user_id = ? OR coach_id = ?', [oldId, oldId]),
        get<any>('SELECT COUNT(*) as c FROM nutrition_plans WHERE user_id = ? OR coach_id = ?', [oldId, oldId]),
        get<any>('SELECT COUNT(*) as c FROM gifts WHERE user_id = ? OR admin_id = ?', [oldId, oldId]),
        get<any>('SELECT COUNT(*) as c FROM payments WHERE user_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM coach_subscriptions WHERE user_id = ? OR coach_id = ?', [oldId, oldId]),
        get<any>('SELECT COUNT(*) as c FROM withdrawals WHERE coach_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM ad_payments WHERE coach_id = ?', [oldId]),
        get<any>('SELECT COUNT(*) as c FROM coach_ads WHERE coach_id = ?', [oldId]),
      ]);
      const totalRefs = refs.reduce((sum, r) => sum + Number(r?.c || 0), 0);
      if (totalRefs > 0) {
        return res.status(409).json({
          message: 'Cannot change user ID after activity exists. Create a new user instead.',
        });
      }
    }

    const role = body.role ?? existing.role;
    if (!['user', 'coach', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const email = String(body.email ?? existing.email).trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const emailConflict = await get<any>('SELECT id FROM users WHERE email = ? AND id != ?', [email, oldId]);
    if (emailConflict) return res.status(409).json({ message: 'Email is already used by another account' });

    let nextPassword = existing.password;
    if (body.password !== undefined && String(body.password).trim() !== '') {
      const plain = String(body.password);
      if (plain.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      nextPassword = await bcrypt.hash(plain, 10);
    }

    // Ensure `is_premium` remains a user-only flag. If the resulting role is not `user`, force it to 0.
    const computedIsPremium = (role === 'user')
      ? (body.is_premium !== undefined ? (body.is_premium ? 1 : 0) : Number(existing.is_premium || 0))
      : 0;

    await run(
      `UPDATE users SET
        id = ?,
        name = ?,
        email = ?,
        password = ?,
        role = ?,
        avatar = ?,
        is_premium = ?,
        points = ?,
        steps = ?,
        height = ?,
        weight = ?,
        gender = ?,
        medical_history = ?,
        medical_file_url = ?,
        membership_paid = ?,
        coach_membership_active = ?,
        step_goal = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        nextId,
        String(body.name ?? existing.name ?? '').trim(),
        email,
        nextPassword,
        role,
        String(body.avatar ?? existing.avatar ?? '').trim(),
        computedIsPremium,
        body.points !== undefined ? Number(body.points || 0) : Number(existing.points || 0),
        body.steps !== undefined ? Number(body.steps || 0) : Number(existing.steps || 0),
        body.height !== undefined && body.height !== '' ? Number(body.height) : (existing.height ?? null),
        body.weight !== undefined && body.weight !== '' ? Number(body.weight) : (existing.weight ?? null),
        body.gender !== undefined ? String(body.gender || '').trim() : (existing.gender ?? null),
        body.medical_history !== undefined ? String(body.medical_history || '').trim() : String(existing.medical_history || ''),
        body.medical_file_url !== undefined ? String(body.medical_file_url || '').trim() : String(existing.medical_file_url || ''),
        body.membership_paid !== undefined ? (body.membership_paid ? 1 : 0) : Number(existing.membership_paid || 0),
        body.coach_membership_active !== undefined ? (body.coach_membership_active ? 1 : 0) : Number(existing.coach_membership_active || 0),
        body.step_goal !== undefined && body.step_goal !== '' ? Number(body.step_goal) : Number(existing.step_goal || 10000),
        oldId,
      ]
    );

    const updated = await get<any>(
      'SELECT id, name, email, role, avatar, is_premium, points, steps, step_goal, height, weight, gender, medical_history, medical_file_url, membership_paid, coach_membership_active, created_at FROM users WHERE id = ?',
      [nextId]
    );

    res.json({ message: 'User updated', user: updated });
  } catch {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// ── Gifts ──────────────────────────────────────────────────────────────────────
router.post('/gifts', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { user_id, title, description, type, value } = req.body;
  const { insertId } = await run('INSERT INTO gifts (user_id, admin_id, title, description, type, value) VALUES (?, ?, ?, ?, ?, ?)', [user_id, req.user.id, title, description, type, value]);
  if (type === 'premium') {
    // Only grant premium to users (not coaches/admins)
    const target = await get<any>('SELECT role FROM users WHERE id = ?', [user_id]);
    if (target && target.role === 'user') {
      await run('UPDATE users SET is_premium = 1 WHERE id = ?', [user_id]);
    }
  }
  if (type === 'points' && value) await run('UPDATE users SET points = points + ? WHERE id = ?', [value, user_id]);
  res.json({ gift: { id: insertId, user_id, title, type, value } });
});

router.get('/gifts', authenticateToken, adminOnly, async (_req: any, res: Response) => {
  try {
    const gifts = await query(`SELECT g.*, u.name as user_name, u.email as user_email FROM gifts g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC`);
    res.json({ gifts });
  } catch { res.status(500).json({ message: 'Failed to fetch gifts' }); }
});

// ── Videos ─────────────────────────────────────────────────────────────────────
router.get('/videos', authenticateToken, adminOnly, async (_req: any, res: Response) => {
  try {
    const videos = await query('SELECT * FROM workout_videos ORDER BY created_at DESC');
    res.json({ videos });
  } catch { res.status(500).json({ message: 'Failed to fetch videos' }); }
});

// Upload video file
router.post('/videos', authenticateToken, adminOnly, uploadVideo.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req: any, res: Response) => {
  try {
    const { title, description, duration, category, is_premium } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    if (!videoFile) return res.status(400).json({ message: 'Video file is required' });

    const videoUrl = `/uploads/${videoFile.filename}`;
    const thumbnailUrl = thumbnailFile ? `/uploads/${thumbnailFile.filename}` : null;
    const durationSeconds = videoFile.size > 0 ? Math.ceil(videoFile.size / (1024 * 1024)) : parseInt(duration || '0');

    const { insertId } = await run(
      'INSERT INTO workout_videos (title, description, url, duration, duration_seconds, category, is_premium, thumbnail) VALUES (?,?,?,?,?,?,?,?)',
      [title, description || '', videoUrl, duration || '', durationSeconds, category || 'General', is_premium === '1' || is_premium === true ? 1 : 0, thumbnailUrl || '']
    );
    const video = await get('SELECT * FROM workout_videos WHERE id = ?', [insertId]);
    res.json({ video, message: 'Video uploaded successfully' });
  } catch (err) {
    console.error('Video upload error:', err);
    res.status(500).json({ message: 'Failed to upload video' });
  }
});

router.patch('/videos/:id', authenticateToken, adminOnly, uploadVideo.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await get<any>('SELECT * FROM workout_videos WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ message: 'Video not found' });

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const videoFile = files?.video?.[0];
    const thumbnailFile = files?.thumbnail?.[0];

    const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : existing.url;
    const thumbnailUrl = thumbnailFile ? `/uploads/${thumbnailFile.filename}` : existing.thumbnail;
    const { title, description, duration, category, is_premium } = req.body;

    await run(
      'UPDATE workout_videos SET title=?, description=?, url=?, duration=?, category=?, is_premium=?, thumbnail=?, updated_at=NOW() WHERE id=?',
      [title || existing.title, description ?? existing.description, videoUrl, duration || existing.duration,
       category || existing.category, is_premium === '1' || is_premium === true ? 1 : 0, thumbnailUrl, id]
    );
    res.json({ message: 'Video updated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update video' });
  }
});

router.delete('/videos/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    await run('DELETE FROM workout_videos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Video deleted' });
  } catch { res.status(500).json({ message: 'Failed to delete video' }); }
});

// ── Ads (full admin management) ────────────────────────────────────────────────
router.get('/ads', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    // Auto-expire active ads past their boost_end
    await run("UPDATE coach_ads SET status = 'expired' WHERE status = 'active' AND boost_end IS NOT NULL AND boost_end < NOW()");
    const ads = await query(`
      SELECT a.*, u.name as coach_name, u.email as coach_email, u.avatar as coach_avatar,
             COALESCE(ap.amount, 0) as paid_amount, COALESCE(ap.duration_minutes, 0) as paid_minutes,
             ap.status as payment_status, ap.proof_url as payment_proof, ap.phone as payment_phone
      FROM coach_ads a
      LEFT JOIN users u ON a.coach_id = u.id
      LEFT JOIN ad_payments ap ON ap.ad_id = a.id
      ORDER BY FIELD(a.status, 'pending', 'active', 'expired', 'rejected'), a.created_at DESC`);
    res.json({ ads });
  } catch { res.status(500).json({ message: 'Failed to fetch ads' }); }
});

router.patch('/ads/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { title, description, specialty, cta, highlight, status } = req.body;
  try {
    await run(
      'UPDATE coach_ads SET title=?, description=?, specialty=?, cta=?, highlight=?, status=?, updated_at=NOW() WHERE id=?',
      [title, description, specialty, cta, highlight, status, id]
    );
    res.json({ message: 'Ad updated' });
  } catch { res.status(500).json({ message: 'Failed to update ad' }); }
});

router.patch('/ads/:id/status', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { status, admin_note } = req.body;
  if (!['active', 'pending', 'rejected', 'expired'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    if (status === 'active') {
      // Calculate boost_end from ad duration
      const ad = await get<any>('SELECT duration_hours, duration_days FROM coach_ads WHERE id = ?', [id]);
      const totalMinutes = ((ad?.duration_hours || 0) * 60) + ((ad?.duration_days || 0) * 24 * 60);
      if (totalMinutes > 0) {
        await run('UPDATE coach_ads SET status = ?, admin_note = ?, boost_start = NOW(), boost_end = DATE_ADD(NOW(), INTERVAL ? MINUTE), updated_at = NOW() WHERE id = ?', [status, admin_note || null, totalMinutes, id]);
      } else {
        await run('UPDATE coach_ads SET status = ?, admin_note = ?, boost_start = NOW(), boost_end = DATE_ADD(NOW(), INTERVAL 7 DAY), updated_at = NOW() WHERE id = ?', [status, admin_note || null, id]);
      }
    } else {
      await run('UPDATE coach_ads SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?', [status, admin_note || null, id]);
    }
    res.json({ message: `Ad ${status}` });
  } catch { res.status(500).json({ message: 'Failed to update ad status' }); }
});

router.delete('/ads/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    await run('DELETE FROM ad_payments WHERE ad_id = ?', [req.params.id]);
    await run('DELETE FROM coach_ads WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ad deleted' });
  } catch { res.status(500).json({ message: 'Failed to delete ad' }); }
});

// Admin: approve/reject ad payment
router.patch('/ads/:id/payment', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { payment_status } = req.body;
  try {
    await run('UPDATE ad_payments SET status = ?, updated_at = NOW() WHERE ad_id = ?', [payment_status, id]);
    if (payment_status === 'approved') {
      // Activate ad and set boost schedule
      const ad = await get<any>('SELECT duration_hours, duration_days FROM coach_ads WHERE id = ?', [id]);
      const totalMinutes = ((ad?.duration_hours || 0) * 60) + ((ad?.duration_days || 0) * 24 * 60);
      if (totalMinutes > 0) {
        await run("UPDATE coach_ads SET status = 'active', boost_start = NOW(), boost_end = DATE_ADD(NOW(), INTERVAL ? MINUTE), updated_at = NOW() WHERE id = ?", [totalMinutes, id]);
      } else {
        await run("UPDATE coach_ads SET status = 'active', boost_start = NOW(), boost_end = DATE_ADD(NOW(), INTERVAL 7 DAY), updated_at = NOW() WHERE id = ?", [id]);
      }
    }
    if (payment_status === 'rejected') {
      await run("UPDATE coach_ads SET status = 'rejected', updated_at = NOW() WHERE id = ?", [id]);
    }
    res.json({ message: 'Payment status updated' });
  } catch { res.status(500).json({ message: 'Failed to update payment' }); }
});

// Admin: ad analytics overview
router.get('/ads/stats', authenticateToken, adminOnly, async (_req: any, res: Response) => {
  try {
    const [totalRow]: any = await query('SELECT COUNT(*) as total FROM coach_ads');
    const [activeRow]: any = await query("SELECT COUNT(*) as cnt FROM coach_ads WHERE status = 'active'");
    const [pendingRow]: any = await query("SELECT COUNT(*) as cnt FROM coach_ads WHERE status = 'pending'");
    const [rejectedRow]: any = await query("SELECT COUNT(*) as cnt FROM coach_ads WHERE status = 'rejected'");
    const [expiredRow]: any = await query("SELECT COUNT(*) as cnt FROM coach_ads WHERE status = 'expired' OR (status = 'active' AND boost_end IS NOT NULL AND boost_end < NOW())");
    const [revenueRow]: any = await query("SELECT IFNULL(SUM(amount),0) as total FROM ad_payments WHERE status = 'approved'");
    const [pendingRevRow]: any = await query("SELECT IFNULL(SUM(amount),0) as total FROM ad_payments WHERE status = 'pending'");
    const [impressionRow]: any = await query('SELECT IFNULL(SUM(impressions),0) as total FROM coach_ads');
    const [clickRow]: any = await query('SELECT IFNULL(SUM(clicks),0) as total FROM coach_ads');
    res.json({
      total: totalRow?.total || 0,
      active: activeRow?.cnt || 0,
      pending: pendingRow?.cnt || 0,
      rejected: rejectedRow?.cnt || 0,
      expired: expiredRow?.cnt || 0,
      adRevenue: parseFloat(revenueRow?.total || 0),
      pendingRevenue: parseFloat(pendingRevRow?.total || 0),
      totalImpressions: impressionRow?.total || 0,
      totalClicks: clickRow?.total || 0,
    });
  } catch { res.status(500).json({ message: 'Failed to fetch ad stats' }); }
});

// ── Payments ───────────────────────────────────────────────────────────────────
router.get('/payments', authenticateToken, adminOnly, async (_req: any, res: Response) => {
  try {
    const payments = await query(`SELECT p.*, u.name as user_name, u.email as user_email FROM payments p LEFT JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC`);
    res.json({ payments });
  } catch { res.status(500).json({ message: 'Failed to fetch payments' }); }
});

// ── Payment Settings ───────────────────────────────────────────────────────────
router.get('/payment-settings', authenticateToken, adminOnly, async (_req: any, res: Response) => {
  try {
    const rows = await query('SELECT setting_key, setting_value FROM payment_settings') as any[];
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.setting_key] = row.setting_value;
    res.json({ settings });
  } catch { res.status(500).json({ message: 'Failed to fetch payment settings' }); }
});

router.put('/payment-settings', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const allowed = [
    'paypal_user_link', 'paypal_coach_link',
    'ewallet_phone', 'ewallet_phone_vodafone', 'ewallet_phone_orange', 'ewallet_phone_we',
    'paypal_user_client_id', 'paypal_coach_client_id',
    'paypal_user_secret', 'paypal_coach_secret',
  ];
  try {
    const body = req.body as Record<string, string>;
    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) continue;
      await run(
        'INSERT INTO payment_settings (setting_key, setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=NOW()',
        [key, body[key]]
      );
    }
    res.json({ message: 'Payment settings saved' });
  } catch (err) { res.status(500).json({ message: 'Failed to save payment settings' }); }
});

// ── Server URL Setting ─────────────────────────────────────────────────────────
router.get('/server-url', authenticateToken, adminOnly, async (_req: any, res: Response) => {
  try {
    const rows = await query(
      "SELECT setting_value FROM payment_settings WHERE setting_key = 'server_url'"
    ) as any[];
    res.json({ url: rows.length ? rows[0].setting_value : '' });
  } catch { res.status(500).json({ message: 'Failed to fetch server URL' }); }
});

router.put('/server-url', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { url } = req.body;
    await run(
      "INSERT INTO payment_settings (setting_key, setting_value) VALUES ('server_url', ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=NOW()",
      [url || '']
    );
    res.json({ message: 'Server URL saved', url: url || '' });
  } catch { res.status(500).json({ message: 'Failed to save server URL' }); }
});

// ── Test Connection ─────────────────────────────────────────────────────────────
router.get('/ping', (_req: any, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;

// ── Moderator (admin + moderator can use these) ─────────────────────────────
const adminOrModerator = (req: any, res: Response, next: any) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'moderator') return res.status(403).json({ message: 'Access denied' });
  next();
};

// Community moderation endpoints
router.get('/community/posts', authenticateToken, adminOrModerator, async (_req: any, res: Response) => {
  try {
    const posts = await query(`
      SELECT p.*, u.name as user_name, u.avatar as user_avatar, u.email as user_email, u.role as user_role,
             (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes,
             (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
             mu.name as moderator_name
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      LEFT JOIN users mu ON p.moderated_by = mu.id
      ORDER BY p.is_pinned DESC, p.is_announcement DESC, p.created_at DESC LIMIT 200`);
    res.json({ posts });
  } catch { res.status(500).json({ message: 'Failed to fetch posts' }); }
});

// ── Create announcement post ─────────────────────────────────────────────────
router.post('/community/announcements', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { content, hashtags } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Content is required' });
    const result = await run(
      'INSERT INTO posts (user_id, content, hashtags, is_announcement, is_pinned) VALUES (?, ?, ?, 1, 1)',
      [req.user.id, content.trim(), hashtags || null]
    );
    res.json({ message: 'Announcement posted', postId: result.insertId });
  } catch { res.status(500).json({ message: 'Failed to create announcement' }); }
});

// ── Toggle pin on a post ─────────────────────────────────────────────────────
router.patch('/community/posts/:id/pin', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const post = await get('SELECT is_pinned FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const newVal = post.is_pinned ? 0 : 1;
    await run('UPDATE posts SET is_pinned = ? WHERE id = ?', [newVal, req.params.id]);
    res.json({ message: newVal ? 'Post pinned' : 'Post unpinned', is_pinned: newVal });
  } catch { res.status(500).json({ message: 'Failed to toggle pin' }); }
});

router.patch('/community/posts/:id/hide', authenticateToken, adminOrModerator, async (req: any, res: Response) => {
  try {
    const { reason } = req.body;
    await run('UPDATE posts SET is_hidden = 1, moderated_by = ?, moderation_reason = ? WHERE id = ?', [req.user.id, reason || 'Policy violation', req.params.id]);
    res.json({ message: 'Post hidden' });
  } catch { res.status(500).json({ message: 'Failed to hide post' }); }
});

router.patch('/community/posts/:id/restore', authenticateToken, adminOrModerator, async (req: any, res: Response) => {
  try {
    await run('UPDATE posts SET is_hidden = 0, moderated_by = NULL, moderation_reason = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post restored' });
  } catch { res.status(500).json({ message: 'Failed to restore post' }); }
});

router.delete('/community/posts/:id', authenticateToken, adminOrModerator, async (req: any, res: Response) => {
  try {
    await run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Post deleted' });
  } catch { res.status(500).json({ message: 'Failed to delete post' }); }
});

// (role update handled by original route above - extended to support moderator)

// ── App Settings ─────────────────────────────────────────────────────────────
router.get('/app-settings', authenticateToken, adminOnly, async (_req: any, res: Response) => {
  try {
    const rows = await query('SELECT * FROM app_settings ORDER BY category, id') as any[];
    const byCategory: Record<string, any[]> = {};
    for (const r of rows) {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push(r);
    }
    res.json({ settings: rows, byCategory });
  } catch { res.status(500).json({ message: 'Failed to fetch settings' }); }
});

router.put('/app-settings', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      await run('UPDATE app_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    }
    res.json({ message: 'Settings saved' });
  } catch { res.status(500).json({ message: 'Failed to save settings' }); }
});

router.post('/app-settings/add', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { key, value, type, category, label } = req.body;
    if (!key || !category) return res.status(400).json({ message: 'Key and category are required' });
    const safeKey = String(key).replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 100);
    const existing = await get('SELECT id FROM app_settings WHERE setting_key = ?', [safeKey]);
    if (existing) return res.status(409).json({ message: 'Setting already exists' });
    await run(
      'INSERT INTO app_settings (setting_key, setting_value, setting_type, category, label) VALUES (?, ?, ?, ?, ?)',
      [safeKey, value || '', type || 'text', category, label || safeKey]
    );
    res.json({ message: 'Setting added', key: safeKey });
  } catch { res.status(500).json({ message: 'Failed to add setting' }); }
});

router.delete('/app-settings/:key', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const safeKey = String(req.params.key).replace(/[^a-zA-Z0-9_]/g, '_');
    await run('DELETE FROM app_settings WHERE setting_key = ?', [safeKey]);
    res.json({ message: 'Setting deleted' });
  } catch { res.status(500).json({ message: 'Failed to delete setting' }); }
});

// ── Coach membership management ──────────────────────────────────────────────
router.patch('/users/:id/coach-membership', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { membership_paid, coach_membership_active } = req.body;
  try {
    await run('UPDATE users SET membership_paid = ?, coach_membership_active = ? WHERE id = ?',
      [membership_paid ? 1 : 0, membership_paid ? 1 : 0, req.params.id]);
    res.json({ message: 'Coach membership updated' });
  } catch { res.status(500).json({ message: 'Failed to update membership' }); }
});

// ── Public font settings (no auth — used by CSS loader) ──────────────────────
router.get('/fonts', async (_req: Request, res: Response) => {
  try {
    const rows = await query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('font_en','font_ar','font_heading')") as any[];
    const fonts: Record<string, string> = {};
    for (const r of rows) fonts[r.setting_key] = r.setting_value;
    res.json(fonts);
  } catch { res.json({ font_en: 'Outfit', font_ar: 'Cairo', font_heading: 'Chakra Petch' }); }
});

// ── Public branding settings (no auth — used by frontend BrandingContext) ────
router.get('/branding', async (_req: Request, res: Response) => {
  try {
    const rows = await query("SELECT setting_key, setting_value FROM app_settings WHERE category = 'branding'") as any[];
    const branding: Record<string, string> = {};
    for (const r of rows) branding[r.setting_key] = r.setting_value || '';
    res.json(branding);
  } catch { res.json({ app_name: 'FitWay Hub' }); }
});

// ── Branding image upload (logo / favicon) ───────────────────────────────────
router.post('/upload-branding-image', authenticateToken, adminOnly, upload.single('image'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch { res.status(500).json({ message: 'Image upload failed' }); }
});

// ── Font file upload ─────────────────────────────────────────────────────────
router.post('/upload-font', authenticateToken, adminOnly, uploadFont.single('font'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No font file provided' });
    const fontUrl = `/uploads/${req.file.filename}`;
    const fontName = req.body.font_name || req.file.originalname.replace(/\.[^.]+$/, '');
    res.json({ url: fontUrl, name: fontName });
  } catch { res.status(500).json({ message: 'Font upload failed' }); }
});
