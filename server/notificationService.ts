/**
 * Notification Service — FCM push, welcome emails, in-app notifications.
 *
 * Push notifications use Firebase Cloud Messaging (FCM) HTTP v1 API.
 * Welcome emails are sent via the existing SMTP email system.
 */

import { run, query, get } from './config/database';
import { getSmtpSettings, sendMail, sendSystemEmail } from './emailServer';

// ── Token helpers ──────────────────────────────────────────────────────────────

function replaceTokens(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ── FCM Push via HTTP v1 ───────────────────────────────────────────────────────

async function getFcmAccessToken(): Promise<string | null> {
  // If a static FCM server key is set (legacy), use that approach via v1 with service account
  // For HTTP v1 we need a service account JSON — check env
  const keyPath = process.env.FCM_SERVICE_ACCOUNT_PATH;
  const serverKey = process.env.FCM_SERVER_KEY;

  if (serverKey) {
    // Legacy API — use directly
    return serverKey;
  }

  if (!keyPath) return null;

  try {
    const fs = await import('fs');
    const jwt = await import('jsonwebtoken');
    const raw = fs.readFileSync(keyPath, 'utf-8');
    const sa = JSON.parse(raw);

    const now = Math.floor(Date.now() / 1000);
    const token = jwt.default.sign(
      {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      },
      sa.private_key,
      { algorithm: 'RS256' }
    );

    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });
    const data: any = await resp.json();
    return data.access_token || null;
  } catch (err) {
    console.error('FCM service account token error:', err);
    return null;
  }
}

async function sendFcmPush(fcmToken: string, title: string, body: string): Promise<boolean> {
  const serverKey = process.env.FCM_SERVER_KEY;
  const projectId = process.env.FCM_PROJECT_ID;

  if (serverKey) {
    // Legacy FCM API
    try {
      const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: { title, body },
          data: { title, body },
        }),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  if (projectId) {
    // HTTP v1 API
    const accessToken = await getFcmAccessToken();
    if (!accessToken) return false;

    try {
      const resp = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: fcmToken,
              notification: { title, body },
              data: { title, body },
            },
          }),
        }
      );
      return resp.ok;
    } catch {
      return false;
    }
  }

  return false;
}

// ── Public API ──────────────────────────────────────────────────────────────────

/** Register or update a user's FCM push token */
export async function registerPushToken(userId: number, token: string, platform: 'android' | 'ios' | 'web' = 'android') {
  await run(
    `INSERT INTO push_tokens (user_id, token, platform) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE token = VALUES(token), updated_at = NOW()`,
    [userId, token, platform]
  );
}

/** Remove a user's push token (e.g. on logout) */
export async function removePushToken(userId: number, platform: 'android' | 'ios' | 'web' = 'android') {
  await run('DELETE FROM push_tokens WHERE user_id = ? AND platform = ?', [userId, platform]);
}

/** Send a push notification to a specific user */
export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  templateId?: number
): Promise<boolean> {
  const tokens = await query<any>('SELECT token FROM push_tokens WHERE user_id = ?', [userId]);
  if (!tokens.length) return false;

  let anySuccess = false;
  for (const t of tokens) {
    const ok = await sendFcmPush(t.token, title, body);
    await run(
      'INSERT INTO push_log (user_id, template_id, title, body, status, error_message) VALUES (?,?,?,?,?,?)',
      [userId, templateId || null, title, body, ok ? 'sent' : 'failed', ok ? null : 'FCM delivery failed']
    );
    if (ok) anySuccess = true;
  }
  return anySuccess;
}

/** Send a push notification from a template slug to a user, with token replacement */
export async function sendPushFromTemplate(
  userId: number,
  slug: string,
  vars: Record<string, string> = {}
): Promise<boolean> {
  const tpl = await get<any>('SELECT * FROM push_templates WHERE slug = ? AND enabled = 1', [slug]);
  if (!tpl) return false;

  const title = replaceTokens(tpl.title, vars);
  const body = replaceTokens(tpl.body, vars);
  return sendPushToUser(userId, title, body, tpl.id);
}

/** Send push to all users matching a segment */
export async function sendPushToSegment(
  title: string,
  body: string,
  segment: 'all' | 'users' | 'coaches' | 'premium' | 'inactive' = 'all',
  templateId?: number
) {
  let sql = 'SELECT DISTINCT pt.user_id, pt.token, u.name FROM push_tokens pt JOIN users u ON u.id = pt.user_id';
  if (segment === 'users') sql += " WHERE u.role = 'user'";
  else if (segment === 'coaches') sql += " WHERE u.role = 'coach'";
  else if (segment === 'premium') sql += ' WHERE u.is_premium = 1';
  else if (segment === 'inactive') sql += ' WHERE u.last_active < DATE_SUB(NOW(), INTERVAL 7 DAY)';

  const rows = await query<any>(sql);
  let sent = 0, failed = 0;
  for (const r of rows) {
    const vars: Record<string, string> = { first_name: (r.name || '').split(' ')[0] };
    const t = replaceTokens(title, vars);
    const b = replaceTokens(body, vars);
    const ok = await sendFcmPush(r.token, t, b);
    await run(
      'INSERT INTO push_log (user_id, template_id, title, body, status) VALUES (?,?,?,?,?)',
      [r.user_id, templateId || null, t, b, ok ? 'sent' : 'failed']
    );
    if (ok) sent++; else failed++;
  }
  return { sent, failed, total: rows.length };
}

/** Create an in-app notification */
export async function createInAppNotification(userId: number, type: string, title: string, body: string, link?: string) {
  await run(
    'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)',
    [userId, type, title, body, link || null]
  );
}

// ── Welcome flow ────────────────────────────────────────────────────────────────

/** Send all enabled welcome messages for a new user or coach */
export async function sendWelcomeMessages(userId: number, role: 'user' | 'coach', name: string, email: string) {
  const firstName = (name || email.split('@')[0]).split(' ')[0];
  const appUrl = (process.env.APP_BASE_URL || 'https://localhost').replace(/\/+$/, '');
  const vars: Record<string, string> = { first_name: firstName, app_url: appUrl };

  const target = role === 'coach' ? 'coach' : 'user';
  const msgs = await query<any>('SELECT * FROM welcome_messages WHERE target = ? AND enabled = 1', [target]);

  for (const msg of msgs) {
    const title = replaceTokens(msg.title, vars);
    const body = replaceTokens(msg.body, vars);

    if (msg.channel === 'push') {
      await sendPushToUser(userId, title, body);
    } else if (msg.channel === 'in_app') {
      await createInAppNotification(userId, 'welcome', title, body, role === 'coach' ? '/coach/profile' : '/app/onboarding');
    } else if (msg.channel === 'email') {
      try {
        const smtpSettings = await getSmtpSettings();
        if (smtpSettings?.enabled && smtpSettings?.smtp_host) {
          const subject = replaceTokens(msg.subject, vars);
          const htmlBody = msg.html_body ? replaceTokens(msg.html_body, vars) : undefined;
          const textBody = replaceTokens(msg.body, vars);

          // Try using an email account first, fall back to system email
          const accounts = await query<any>('SELECT id FROM email_accounts LIMIT 1');
          if (accounts.length > 0) {
            await sendMail({
              fromAccountId: accounts[0].id,
              to: email,
              subject,
              text: textBody,
              html: htmlBody,
            });
          } else {
            await sendSystemEmail({ to: email, subject, text: textBody, html: htmlBody });
          }
        }
      } catch (err) {
        console.error('Welcome email send error:', err);
      }
    }
  }
}
