/**
 * Notification Routes — push tokens, templates, welcome messages, sending.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query, get, run } from '../config/database';

const adminOnly = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};
import {
  registerPushToken,
  removePushToken,
  sendPushToUser,
  sendPushFromTemplate,
  sendPushToSegment,
  createInAppNotification,
} from '../notificationService';

const router = Router();

// ── User: register / remove push token ────────────────────────────────────────

router.post('/push-token', authenticateToken, async (req: any, res: Response) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'Push token is required' });
    await registerPushToken(req.user.id, token, platform || 'android');
    res.json({ message: 'Push token registered' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to register token' });
  }
});

router.delete('/push-token', authenticateToken, async (req: any, res: Response) => {
  try {
    const { platform } = req.body;
    await removePushToken(req.user.id, platform || 'android');
    res.json({ message: 'Push token removed' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to remove token' });
  }
});

// ── User: list own notifications (in-app) ─────────────────────────────────────

router.get('/list', authenticateToken, async (req: any, res: Response) => {
  try {
    const rows = await query(
      'SELECT id, type, title, body, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/read/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/read-all', authenticateToken, async (req: any, res: Response) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: push templates ─────────────────────────────────────────────────────

router.get('/templates', authenticateToken, adminOnly, async (_req: Request, res: Response) => {
  try {
    const rows = await query('SELECT * FROM push_templates ORDER BY category, slug');
    res.json({ templates: rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/templates/:id', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { title, body, enabled, trigger_type } = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (body !== undefined) { fields.push('body = ?'); values.push(body); }
    if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
    if (trigger_type !== undefined) { fields.push('trigger_type = ?'); values.push(trigger_type); }
    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
    values.push(req.params.id);
    await run(`UPDATE push_templates SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Template updated' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/templates', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { slug, title, body, category, trigger_type } = req.body;
    if (!slug || !title || !body) return res.status(400).json({ message: 'slug, title, and body are required' });
    await run(
      'INSERT INTO push_templates (slug, title, body, category, trigger_type) VALUES (?,?,?,?,?)',
      [slug, title, body, category || 'engagement', trigger_type || 'manual']
    );
    res.status(201).json({ message: 'Template created' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/templates/:id', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    await run('DELETE FROM push_templates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: welcome messages ───────────────────────────────────────────────────

router.get('/welcome-messages', authenticateToken, adminOnly, async (_req: Request, res: Response) => {
  try {
    const rows = await query('SELECT * FROM welcome_messages ORDER BY target, channel');
    res.json({ messages: rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/welcome-messages/:id', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { subject, title, body, html_body, enabled } = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    if (subject !== undefined) { fields.push('subject = ?'); values.push(subject); }
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (body !== undefined) { fields.push('body = ?'); values.push(body); }
    if (html_body !== undefined) { fields.push('html_body = ?'); values.push(html_body); }
    if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
    values.push(req.params.id);
    await run(`UPDATE welcome_messages SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Welcome message updated' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: send push notification ─────────────────────────────────────────────

router.post('/send', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId, title, body, segment, templateSlug, vars } = req.body;

    if (templateSlug && userId) {
      // Send specific template to a specific user
      const ok = await sendPushFromTemplate(userId, templateSlug, vars || {});
      return res.json({ message: ok ? 'Sent' : 'No token or template not found', sent: ok ? 1 : 0 });
    }

    if (userId && title && body) {
      // Send custom push to a specific user
      const ok = await sendPushToUser(userId, title, body);
      return res.json({ message: ok ? 'Sent' : 'No push token for user', sent: ok ? 1 : 0 });
    }

    if (title && body) {
      // Blast to segment
      const result = await sendPushToSegment(title, body, segment || 'all');
      return res.json({ message: `Sent ${result.sent}/${result.total}`, ...result });
    }

    return res.status(400).json({ message: 'Provide title + body (and optionally userId or segment)' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: push log ───────────────────────────────────────────────────────────

router.get('/log', authenticateToken, adminOnly, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit)) || 50, 500);
    const rows = await query(
      `SELECT pl.*, u.name as user_name, u.email as user_email, pt.slug as template_slug
       FROM push_log pl
       LEFT JOIN users u ON u.id = pl.user_id
       LEFT JOIN push_templates pt ON pt.id = pl.template_id
       ORDER BY pl.created_at DESC LIMIT ?`,
      [limit]
    );
    res.json({ log: rows });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ── Admin: FCM config status ──────────────────────────────────────────────────

router.get('/fcm-status', authenticateToken, adminOnly, async (_req: Request, res: Response) => {
  const hasServerKey = !!process.env.FCM_SERVER_KEY;
  const hasServiceAccount = !!process.env.FCM_SERVICE_ACCOUNT_PATH;
  const hasProjectId = !!process.env.FCM_PROJECT_ID;
  const tokenCount = await get<any>('SELECT COUNT(*) as cnt FROM push_tokens');
  res.json({
    configured: hasServerKey || (hasServiceAccount && hasProjectId),
    method: hasServerKey ? 'legacy' : hasServiceAccount ? 'http_v1' : 'none',
    registeredDevices: tokenCount?.cnt || 0,
  });
});

export default router;
