import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { run, query, get } from './config/database';

let smtpInstance: SMTPServer | null = null;

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: 'none' | 'tls' | 'starttls';
  from_name: string;
  from_email: string;
  enabled: number;
}

/** Extract domain from APP_BASE_URL or fallback */
export function getMailDomain(): string {
  const base = process.env.APP_BASE_URL || '';
  try {
    const u = new URL(base);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'localhost';
  }
}

/** Load SMTP settings from database */
export async function getSmtpSettings(): Promise<SmtpSettings | undefined> {
  return get<SmtpSettings>('SELECT * FROM email_settings WHERE id = 1');
}

/** Save SMTP settings to database */
export async function saveSmtpSettings(s: Partial<SmtpSettings>) {
  const current = await getSmtpSettings();
  if (!current) {
    await run('INSERT INTO email_settings (id) VALUES (1)');
  }
  const fields: string[] = [];
  const values: any[] = [];
  for (const [k, v] of Object.entries(s)) {
    if (['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_secure', 'from_name', 'from_email', 'enabled'].includes(k)) {
      fields.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (fields.length === 0) return;
  await run(`UPDATE email_settings SET ${fields.join(', ')} WHERE id = 1`, values);
}

/** Create a nodemailer transporter from saved SMTP settings */
function createTransporter(settings: SmtpSettings): Transporter {
  const secure = settings.smtp_secure === 'tls'; // true = direct TLS (port 465 typically)
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port,
    secure,
    auth: settings.smtp_user
      ? { user: settings.smtp_user, pass: settings.smtp_pass }
      : undefined,
    tls: { rejectUnauthorized: false },
  });
}

/** Test SMTP connection — returns { ok, message } */
export async function testSmtpConnection(): Promise<{ ok: boolean; message: string }> {
  const settings = await getSmtpSettings();
  if (!settings || !settings.smtp_host) {
    return { ok: false, message: 'SMTP not configured. Please fill in SMTP settings first.' };
  }
  try {
    const transporter = createTransporter(settings);
    await transporter.verify();
    return { ok: true, message: 'SMTP connection successful!' };
  } catch (err: any) {
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
}

/** Send an email via the configured SMTP relay */
export async function sendMail(opts: {
  fromAccountId: number;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  const settings = await getSmtpSettings();
  if (!settings || !settings.smtp_host) {
    throw new Error('Email sending is not configured. Go to Admin → Email Server → SMTP Settings to set up your SMTP relay.');
  }
  if (!settings.enabled) {
    throw new Error('Email sending is disabled. Enable it in Admin → Email Server → SMTP Settings.');
  }

  const account = await get<any>('SELECT * FROM email_accounts WHERE id = ?', [opts.fromAccountId]);
  if (!account) throw new Error('Email account not found');

  const transporter = createTransporter(settings);

  // Use the SMTP-authenticated from address as the envelope sender
  // (most SMTP relays reject sending from non-authenticated addresses)
  const envelopeFrom = settings.from_email || settings.smtp_user;
  const envelopeName = settings.from_name || account.display_name || 'FitWay Hub';

  const info = await transporter.sendMail({
    from: `${envelopeName} <${envelopeFrom}>`,
    replyTo: `${account.display_name} <${account.email}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  await run(
    `INSERT INTO emails (account_id, sender, recipient, subject, text_body, html_body, direction, message_id)
     VALUES (?, ?, ?, ?, ?, ?, 'outbound', ?)`,
    [opts.fromAccountId, account.email, opts.to, opts.subject, opts.text || '', opts.html || '', info.messageId || '']
  );

  return info;
}

/** Send a system email directly via SMTP without requiring an email account.
 *  Uses the configured SMTP settings and from_name/from_email. */
export async function sendSystemEmail(opts: { to: string; subject: string; text?: string; html?: string }) {
  const settings = await getSmtpSettings();
  if (!settings || !settings.smtp_host || !settings.enabled) return false;

  try {
    const transporter = createTransporter(settings);
    const fromAddr = settings.from_email || settings.smtp_user;
    const fromName = settings.from_name || 'FitWay Hub';
    await transporter.sendMail({
      from: `${fromName} <${fromAddr}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error('System email send error:', err);
    return false;
  }
}

/** Start the local SMTP receive server (for inbound emails when DNS is configured) */
export function startSmtpServer(port = 2525) {
  if (smtpInstance) return;

  const domain = getMailDomain();

  smtpInstance = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    name: domain,
    banner: `${domain} SMTP`,
    size: 10 * 1024 * 1024,

    async onData(stream, session, callback) {
      try {
        const parsed = await simpleParser(stream);

        const from = parsed.from?.text || '';
        const toList = parsed.to
          ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
          : [];
        const subject = parsed.subject || '(no subject)';
        const textBody = parsed.text || '';
        const htmlBody = parsed.html || '';

        for (const addr of toList) {
          const addresses = addr.value || [];
          for (const a of addresses) {
            const email = (a.address || '').toLowerCase();
            const acct = await get<any>('SELECT id FROM email_accounts WHERE email = ?', [email]);
            if (acct) {
              await run(
                `INSERT INTO emails (account_id, sender, recipient, subject, text_body, html_body, direction)
                 VALUES (?, ?, ?, ?, ?, ?, 'inbound')`,
                [acct.id, from, email, subject, textBody, htmlBody]
              );
            }
          }
        }
        callback();
      } catch (err: any) {
        console.error('SMTP onData error:', err);
        callback(new Error('Processing failed'));
      }
    },

    onError(err) {
      console.error('SMTP server error:', err);
    },
  } as any);

  smtpInstance.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  SMTP port ${port} already in use — skipping SMTP server`);
    } else {
      console.error('SMTP server error:', err);
    }
  });

  smtpInstance.listen(port, '0.0.0.0', () => {
    console.log(`📧  SMTP server listening on port ${port} (domain: ${domain})`);
  });
}
