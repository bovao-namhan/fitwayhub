import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID, createHash } from 'crypto';
import { resolve4, resolve6, resolveMx } from 'dns/promises';
import { UserModel } from '../models/User';
import { get, run, query } from '../config/database';

const DISPOSABLE_OR_FAKE_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
]);

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

function normalizeEmail(input: string) {
  return String(input || '').trim().toLowerCase();
}

async function hasMailCapableDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || DISPOSABLE_OR_FAKE_DOMAINS.has(domain)) return false;

  try {
    const mx = await resolveMx(domain);
    if (mx && mx.length > 0) return true;
  } catch (err: any) {
    if (['ENOTFOUND', 'ENODATA', 'ENOTIMP', 'SERVFAIL'].includes(err?.code)) {
      return false;
    }
  }

  try {
    const [a4, a6] = await Promise.allSettled([resolve4(domain), resolve6(domain)]);
    const hasA4 = a4.status === 'fulfilled' && a4.value.length > 0;
    const hasA6 = a6.status === 'fulfilled' && a6.value.length > 0;
    return hasA4 || hasA6;
  } catch {
    return false;
  }
}

function getAppBaseUrl(req: Request) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function issueLoginToken(user: any) {
  return jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '30d' });
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

async function enforceOneSessionPerIp(userId: number, ip: string, token: string) {
  // Clean up expired sessions
  await run('DELETE FROM active_sessions WHERE expires_at < NOW()');
  // Check if another user has an active session from this IP
  const existing = await get<any>(
    'SELECT user_id FROM active_sessions WHERE ip_address = ? AND user_id != ? LIMIT 1',
    [ip, userId]
  );
  if (existing) {
    return false; // Another account is logged in from this IP
  }
  // Remove any old sessions for this user
  await run('DELETE FROM active_sessions WHERE user_id = ?', [userId]);
  // Insert new session
  const tokenHash = hashToken(token);
  await run(
    'INSERT INTO active_sessions (user_id, ip_address, token_hash, expires_at) VALUES (?,?,?, DATE_ADD(NOW(), INTERVAL 30 DAY))',
    [userId, ip, tokenHash]
  );
  return true;
}

function issueOauthState(provider: 'google' | 'facebook') {
  return jwt.sign({ provider, nonce: randomUUID() }, getJwtSecret(), { expiresIn: '10m' });
}

function verifyOauthState(state: string | undefined, provider: 'google' | 'facebook') {
  if (!state) return false;
  try {
    const decoded = jwt.verify(state, getJwtSecret()) as any;
    return decoded?.provider === provider;
  } catch {
    return false;
  }
}

async function createOrGetSocialUser(params: { email: string; name?: string; avatar?: string; provider: 'google' | 'facebook' }) {
  const email = normalizeEmail(params.email);
  const existing = await UserModel.findByEmail(email);
  if (existing) {
    if (params.name || params.avatar) {
      await UserModel.updateProfile(existing.id, { name: params.name, avatar: params.avatar });
    }
    return existing;
  }

  const generatedPasswordHash = await bcrypt.hash(`social-${params.provider}-${randomUUID()}`, 12);
  const user = await UserModel.create(email, generatedPasswordHash);
  await run(
    'UPDATE users SET name = ?, role = ?, avatar = ?, is_premium = 0, membership_paid = 0 WHERE id = ?',
    [params.name || email.split('@')[0], 'user', params.avatar || null, user.id]
  );

  const regPoints = await get<any>('SELECT setting_value FROM app_settings WHERE setting_key = ?', ['registration_points_gift']);
  const pointsGift = parseInt((regPoints as any)?.setting_value || '200');
  await run('UPDATE users SET points = ? WHERE id = ?', [pointsGift, user.id]);
  await run('INSERT INTO point_transactions (user_id, points, reason, reference_type) VALUES (?,?,?,?)', [user.id, pointsGift, `Welcome gift - ${params.provider} signup`, 'registration']);

  return user;
}

async function finalizeSocialLogin(res: Response, req: Request, data: { email: string; name?: string; avatar?: string; provider: 'google' | 'facebook' }) {
  const user = await createOrGetSocialUser(data);
  const token = issueLoginToken(user);
  const base = getAppBaseUrl(req);
  return res.redirect(`${base}/auth/social-callback?token=${encodeURIComponent(token)}`);
}

export const register = async (req: Request, res: Response) => {
  try {
    const { password, name, role, securityQuestion, securityAnswer } = req.body;
    const email = normalizeEmail(req.body?.email);
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    if (!securityQuestion || !securityAnswer) return res.status(400).json({ message: 'Security question and answer are required' });
    
    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });

    const hasValidDomain = await hasMailCapableDomain(email);
    if (!hasValidDomain) return res.status(400).json({ message: 'Email domain is not valid for receiving mail' });
    
    // Password strength: min 8 chars, 1 uppercase, 1 number, 1 special
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ message: 'Password must contain at least one number' });
    if (!/[^A-Za-z0-9]/.test(password)) return res.status(400).json({ message: 'Password must contain at least one special character' });
    
    const existing = await UserModel.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await UserModel.create(email, hashedPassword);
    
    // Set name and role (default to user if not specified, but allow coach)
    const userRole = (role === 'coach') ? 'coach' : 'user';
    if (name) await run('UPDATE users SET name = ?, role = ?, is_premium = 0, membership_paid = 0 WHERE id = ?', [name, userRole, user.id]);
    else await run('UPDATE users SET role = ?, is_premium = 0, membership_paid = 0 WHERE id = ?', [userRole, user.id]);
    
    // Save security question & hashed answer
    const hashedAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 12);
    await UserModel.setSecurityQuestion(user.id, securityQuestion, hashedAnswer);
    
    // Gift system: 200 points on registration
    const regPoints = await get<any>('SELECT setting_value FROM app_settings WHERE setting_key = ?', ['registration_points_gift']);
    const pointsGift = parseInt((regPoints as any)?.setting_value || '200');
    await run('UPDATE users SET points = ? WHERE id = ?', [pointsGift, user.id]);
    await run('INSERT INTO point_transactions (user_id, points, reason, reference_type) VALUES (?,?,?,?)', [user.id, pointsGift, 'Welcome gift - registration bonus', 'registration']);
    
    const token = issueLoginToken(user);
    const ip = getClientIp(req);
    await enforceOneSessionPerIp(user.id, ip, token);
    const fullUser = await get('SELECT id, name, email, role, avatar, is_premium, coach_membership_active, membership_paid, points, steps, step_goal, height, weight, gender, created_at FROM users WHERE id = ?', [user.id]);
    res.status(201).json({ message: 'User registered successfully', token, user: fullUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const password = req.body?.password;
    const email = normalizeEmail(req.body?.email);
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const user = await UserModel.findByEmail(email) || await UserModel.findByUsername(email);
    if (!user || !user.password) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = issueLoginToken(user);
    const ip = getClientIp(req);

    // Enforce one account per IP
    const allowed = await enforceOneSessionPerIp(user.id, ip, token);
    if (!allowed) {
      return res.status(403).json({ message: 'Another account is already logged in from this network. Please log out of the other account first.', code: 'IP_SESSION_CONFLICT' });
    }

    const fullUser = await get('SELECT id, name, email, role, avatar, is_premium, coach_membership_active, membership_paid, points, steps, step_goal, height, weight, gender, created_at FROM users WHERE id = ?', [user.id]);
    res.json({ message: 'Login successful', token, user: fullUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const forgotPasswordGetQuestion = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await UserModel.findByEmail(email) || await UserModel.findByUsername(email);
    // Don't reveal whether account exists — always return a generic response
    if (!user || !user.security_question) return res.json({ question: 'Please answer your security question' });
    return res.json({ question: user.security_question });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPasswordVerify = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { securityAnswer, newPassword } = req.body;
    if (!email || !securityAnswer || !newPassword) return res.status(400).json({ message: 'Email, security answer, and new password are required' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    const user = await UserModel.findByEmail(email) || await UserModel.findByUsername(email);
    if (!user || !user.security_answer) return res.status(404).json({ message: 'Account not found' });
    const answerMatch = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.security_answer);
    if (!answerMatch) return res.status(401).json({ message: 'Incorrect security answer' });
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(user.id, hashedPassword);
    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await run('DELETE FROM active_sessions WHERE user_id = ?', [userId]);
    }
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.json({ message: 'Logged out' });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password are required' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    const user = await UserModel.findById(userId);
    if (!user || !user.password) return res.status(404).json({ message: 'User not found' });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(userId, hashedPassword);
    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const loginWithRememberToken = async (req: Request, res: Response) => {
  try {
    const { rememberToken } = req.body;
    if (!rememberToken) return res.status(400).json({ message: 'Remember token is required' });
    const user = await UserModel.findByRememberToken(rememberToken);
    if (!user) return res.status(401).json({ message: 'Invalid remember token' });
    const token = jwt.sign({ id: user.id, email: user.email }, getJwtSecret(), { expiresIn: '1d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Auto-login successful', token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const oauthGoogleStart = async (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Google OAuth is not configured')}`);
  }

  const state = issueOauthState('google');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const oauthGoogleCallback = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!verifyOauthState(state, 'google')) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Invalid OAuth state')}`);
    }
    if (!code) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Missing Google OAuth code')}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Google OAuth not configured')}`);
    }

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData: any = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Google token exchange failed')}`);
    }

    const profileResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile: any = await profileResp.json();

    const email = normalizeEmail(profile?.email);
    if (!email) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Google account has no email')}`);
    }

    return finalizeSocialLogin(res, req, {
      provider: 'google',
      email,
      name: profile?.name,
      avatar: profile?.picture,
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Google login failed')}`);
  }
};

export const oauthFacebookStart = async (req: Request, res: Response) => {
  const clientId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Facebook OAuth is not configured')}`);
  }

  const state = issueOauthState('facebook');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'email,public_profile',
    state,
  });
  return res.redirect(`https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`);
};

export const oauthFacebookCallback = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!verifyOauthState(state, 'facebook')) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Invalid OAuth state')}`);
    }
    if (!code) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Missing Facebook OAuth code')}`);
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    if (!appId || !appSecret || !redirectUri) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Facebook OAuth not configured')}`);
    }

    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const tokenResp = await fetch(`https://graph.facebook.com/v20.0/oauth/access_token?${tokenParams.toString()}`);
    const tokenData: any = await tokenResp.json();
    if (!tokenResp.ok || !tokenData.access_token) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Facebook token exchange failed')}`);
    }

    const profileParams = new URLSearchParams({
      fields: 'id,name,email,picture.type(large)',
      access_token: tokenData.access_token,
    });
    const profileResp = await fetch(`https://graph.facebook.com/me?${profileParams.toString()}`);
    const profile: any = await profileResp.json();

    const email = normalizeEmail(profile?.email);
    if (!email) {
      return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Facebook account has no email')}`);
    }

    return finalizeSocialLogin(res, req, {
      provider: 'facebook',
      email,
      name: profile?.name,
      avatar: profile?.picture?.data?.url,
    });
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return res.redirect(`${getAppBaseUrl(req)}/auth/login?error=${encodeURIComponent('Facebook login failed')}`);
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { height, weight, gender, name, avatar } = req.body;
    const result = await UserModel.updateProfile(userId, { height, weight, gender, name, avatar });
    if (result === null) return res.status(400).json({ message: 'No profile fields provided' });
    const updated = await UserModel.findById(userId);
    const { password: _, ...userWithoutPassword } = updated || {} as any;
    res.json({ message: 'Profile updated', user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addOfflineSteps = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Accept both single entry and batch array
    const body = req.body;
    const entries: any[] = Array.isArray(body) ? body : [body];

    let synced = 0;
    for (const entry of entries) {
      const { steps, date, caloriesBurned, distanceKm, trackingMode, notes } = entry;
      if (!steps || !date) continue;

      // Upsert — if entry already exists for that date, accumulate steps
      const existing: any = await get('SELECT id, steps FROM steps_entries WHERE user_id = ? AND date = ?', [userId, date]);
      if (existing) {
        const newSteps = Math.max(existing.steps, steps); // take highest value to avoid doubling
        await run(
          'UPDATE steps_entries SET steps = ?, calories_burned = COALESCE(?, calories_burned), distance_km = COALESCE(?, distance_km), tracking_mode = COALESCE(?, tracking_mode), notes = COALESCE(?, notes) WHERE user_id = ? AND date = ?',
          [newSteps, caloriesBurned || null, distanceKm || null, trackingMode || null, notes || null, userId, date]
        );
      } else {
        await run(
          'INSERT INTO steps_entries (user_id, date, steps, calories_burned, distance_km, tracking_mode, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, date, steps, caloriesBurned || null, distanceKm || null, trackingMode || 'manual', notes || null]
        );
      }

      // Update the user's overall steps to the most recent day's total
      await run('UPDATE users SET steps = ?, last_sync = NOW() WHERE id = ?', [steps, userId]);
      synced++;
    }

    res.json({ message: `Synced ${synced} entr${synced === 1 ? 'y' : 'ies'}`, synced });
  } catch (error) {
    console.error('addOfflineSteps error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
