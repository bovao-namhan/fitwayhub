import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { get, run, query } from '../config/database';
import { getMailDomain, sendMail, getSmtpSettings, saveSmtpSettings, testSmtpConnection } from '../emailServer';

const router = Router();

const adminOnly = (req: any, res: Response, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// ── Get mail domain ─────────────────────────────────────────────
router.get('/domain', authenticateToken, adminOnly, (_req: Request, res: Response) => {
  res.json({ domain: getMailDomain() });
});

// ── SMTP Settings ───────────────────────────────────────────────
router.get('/settings', authenticateToken, adminOnly, async (_req: Request, res: Response) => {
  try {
    const settings = await getSmtpSettings();
    if (!settings) return res.json({ settings: { smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_secure: 'starttls', from_name: '', from_email: '', enabled: 0 } });
    // Don't expose full password — show masked version
    const masked = { ...settings, smtp_pass: settings.smtp_pass ? '••••••••' : '' };
    res.json({ settings: masked });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ message: 'Failed to load settings' });
  }
});

router.put('/settings', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, from_name, from_email, enabled } = req.body;
    const update: any = {};
    if (smtp_host !== undefined) update.smtp_host = String(smtp_host).trim();
    if (smtp_port !== undefined) update.smtp_port = Number(smtp_port) || 587;
    if (smtp_user !== undefined) update.smtp_user = String(smtp_user).trim();
    // Only update password if it's not the masked placeholder
    if (smtp_pass !== undefined && smtp_pass !== '••••••••') update.smtp_pass = String(smtp_pass);
    if (smtp_secure !== undefined && ['none', 'tls', 'starttls'].includes(smtp_secure)) update.smtp_secure = smtp_secure;
    if (from_name !== undefined) update.from_name = String(from_name).trim();
    if (from_email !== undefined) update.from_email = String(from_email).trim();
    if (enabled !== undefined) update.enabled = enabled ? 1 : 0;
    await saveSmtpSettings(update);
    res.json({ message: 'Settings saved' });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ message: 'Failed to save settings' });
  }
});

router.post('/settings/test', authenticateToken, adminOnly, async (_req: Request, res: Response) => {
  try {
    const result = await testSmtpConnection();
    res.json(result);
  } catch (err: any) {
    res.json({ ok: false, message: err.message || 'Test failed' });
  }
});

router.post('/settings/test-send', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ ok: false, message: 'Recipient email is required' });

    const settings = await getSmtpSettings();
    if (!settings || !settings.smtp_host) {
      return res.json({ ok: false, message: 'SMTP not configured' });
    }

    const nodemailer = await import('nodemailer');
    const secure = settings.smtp_secure === 'tls';
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure,
      auth: settings.smtp_user ? { user: settings.smtp_user, pass: settings.smtp_pass } : undefined,
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: settings.from_email ? `${settings.from_name || 'FitWay Hub'} <${settings.from_email}>` : settings.smtp_user,
      to: String(to).trim(),
      subject: 'FitWay Hub - Test Email',
      text: 'This is a test email from FitWay Hub Email Server. If you received this, your SMTP settings are working correctly!',
      html: '<div style="font-family:sans-serif;padding:20px"><h2>FitWay Hub - Test Email</h2><p>If you received this, your SMTP settings are working correctly!</p></div>',
    });

    res.json({ ok: true, message: `Test email sent to ${to}` });
  } catch (err: any) {
    res.json({ ok: false, message: `Send failed: ${err.message}` });
  }
});

// ── List email accounts ─────────────────────────────────────────
router.get('/accounts', authenticateToken, adminOnly, async (_req: Request, res: Response) => {
  try {
    const accounts = await query('SELECT id, email, display_name, created_at FROM email_accounts ORDER BY created_at DESC');
    res.json({ accounts });
  } catch (err) {
    console.error('List accounts error:', err);
    res.status(500).json({ message: 'Failed to list email accounts' });
  }
});

// ── Create email account ────────────────────────────────────────
router.post('/accounts', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const domain = getMailDomain();
    const localPart = String(req.body.local_part || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const displayName = String(req.body.display_name || '').trim();

    if (!localPart) return res.status(400).json({ message: 'Local part (before @) is required' });
    if (localPart.length > 64) return res.status(400).json({ message: 'Local part too long (max 64 chars)' });

    const email = `${localPart}@${domain}`;

    const existing = await get<any>('SELECT id FROM email_accounts WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ message: `Email ${email} already exists` });

    const { insertId } = await run(
      'INSERT INTO email_accounts (email, display_name) VALUES (?, ?)',
      [email, displayName || localPart]
    );

    res.status(201).json({ id: insertId, email, display_name: displayName || localPart });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ message: 'Failed to create email account' });
  }
});

// ── Delete email account ────────────────────────────────────────
router.delete('/accounts/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    await run('DELETE FROM email_accounts WHERE id = ?', [id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

// ── List emails (inbox / sent) for an account ───────────────────
router.get('/accounts/:id/emails', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const accountId = Number(req.params.id);
    const direction = req.query.direction === 'outbound' ? 'outbound' : 'inbound';
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);

    const emails = await query(
      `SELECT id, sender, recipient, subject, text_body, html_body, direction, is_read, message_id, created_at
       FROM emails
       WHERE account_id = ? AND direction = ?
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      [accountId, direction]
    );
    res.json({ emails });
  } catch (err) {
    console.error('List emails error:', err);
    res.status(500).json({ message: 'Failed to list emails' });
  }
});

// ── Get single email ────────────────────────────────────────────
router.get('/emails/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    const email = await get<any>(
      `SELECT e.*, ea.email AS account_email, ea.display_name AS account_name
       FROM emails e
       JOIN email_accounts ea ON ea.id = e.account_id
       WHERE e.id = ?`,
      [id]
    );
    if (!email) return res.status(404).json({ message: 'Email not found' });

    // Mark as read
    if (!email.is_read) {
      await run('UPDATE emails SET is_read = 1 WHERE id = ?', [id]);
      email.is_read = 1;
    }

    res.json({ email });
  } catch (err) {
    console.error('Get email error:', err);
    res.status(500).json({ message: 'Failed to get email' });
  }
});

// ── Send email ──────────────────────────────────────────────────
router.post('/send', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { account_id, to, subject, text, html } = req.body;
    if (!account_id || !to || !subject) {
      return res.status(400).json({ message: 'account_id, to, and subject are required' });
    }

    const toAddress = String(to).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toAddress)) {
      return res.status(400).json({ message: 'Invalid recipient email address' });
    }

    await sendMail({
      fromAccountId: Number(account_id),
      to: toAddress,
      subject: String(subject),
      text: text ? String(text) : undefined,
      html: html ? String(html) : undefined,
    });

    res.json({ message: 'Email sent' });
  } catch (err: any) {
    console.error('Send email error:', err);
    res.status(500).json({ message: err.message || 'Failed to send email' });
  }
});

// ── Delete email ────────────────────────────────────────────────
router.delete('/emails/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const id = Number(req.params.id);
    await run('DELETE FROM emails WHERE id = ?', [id]);
    res.json({ message: 'Email deleted' });
  } catch (err) {
    console.error('Delete email error:', err);
    res.status(500).json({ message: 'Failed to delete email' });
  }
});

export default router;
