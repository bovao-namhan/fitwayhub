import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { get, run, query } from '../config/database';

const router = Router();

router.patch('/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { name, height, weight, gender, avatar, points } = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    if (name    !== undefined) { fields.push('name = ?');    values.push(name); }
    if (height  !== undefined) { fields.push('height = ?');  values.push(height); }
    if (weight  !== undefined) { fields.push('weight = ?');  values.push(weight); }
    if (gender  !== undefined) { fields.push('gender = ?');  values.push(gender); }
    if (avatar  !== undefined) { fields.push('avatar = ?');  values.push(avatar); }
    if (points  !== undefined) { fields.push('points = ?');  values.push(points); }
    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
    values.push(userId);
    await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    const updated = await get('SELECT id, name, email, role, avatar, is_premium, coach_membership_active, points, steps, step_goal, height, weight, gender, created_at FROM users WHERE id = ?', [userId]);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

router.post('/points', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { points } = req.body;
    if (points === undefined) return res.status(400).json({ message: 'points required' });
    await run('UPDATE users SET points = ? WHERE id = ?', [points, userId]);
    const updated = await get('SELECT id, name, email, role, avatar, is_premium, coach_membership_active, points, steps, step_goal, height, weight, gender, created_at FROM users WHERE id = ?', [userId]);
    return res.json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Could not update points' });
  }
});

// User: set own step goal (only if no active coach)
router.patch('/step-goal', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { step_goal } = req.body;
    if (!step_goal || step_goal < 100) return res.status(400).json({ message: 'Invalid step goal' });
    const bookings = await query<any>('SELECT id FROM coaching_bookings WHERE user_id = ? AND status = ? LIMIT 1', [userId, 'accepted']);
    if (bookings.length > 0) return res.status(403).json({ message: 'Your step goal is set by your coach' });
    await run('UPDATE users SET step_goal = ? WHERE id = ?', [step_goal, userId]);
    res.json({ success: true, step_goal });
  } catch {
    res.status(500).json({ message: 'Failed to update step goal' });
  }
});

// ── Upload proof image ─────────────────────────────────────────────────────────
import { upload } from '../middleware/upload';
router.post('/upload-proof', authenticateToken, upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch { res.status(500).json({ message: 'Upload failed' }); }
});

// ── Point transactions history ─────────────────────────────────────────────────
router.get('/points/history', authenticateToken, async (req: any, res: any) => {
  try {
    const transactions = await query('SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json({ transactions });
  } catch { res.status(500).json({ message: 'Failed to fetch point history' }); }
});


// Medical history
router.get('/medical-history', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await get<any>('SELECT medical_history, medical_file_url FROM users WHERE id = ?', [req.user.id]);
    res.json({ medical_history: user?.medical_history || '', medical_file_url: user?.medical_file_url || null });
  } catch { res.status(500).json({ message: 'Failed to fetch medical history' }); }
});

router.post('/medical-history', authenticateToken, upload.single('medical'), async (req: any, res: any) => {
  try {
    const { medical_history } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if (fileUrl) {
      await run('UPDATE users SET medical_history = ?, medical_file_url = ? WHERE id = ?', [medical_history || '', fileUrl, req.user.id]);
      res.json({ message: 'Saved', file_url: fileUrl });
    } else {
      await run('UPDATE users SET medical_history = ? WHERE id = ?', [medical_history || '', req.user.id]);
      res.json({ message: 'Saved' });
    }
  } catch { res.status(500).json({ message: 'Failed to save medical history' }); }
});

export default router;
