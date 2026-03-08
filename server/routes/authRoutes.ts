import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  forgotPasswordGetQuestion,
  forgotPasswordVerify,
  changePassword,
  loginWithRememberToken,
  addOfflineSteps,
  updateProfile,
  oauthGoogleStart,
  oauthGoogleCallback,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { get } from '../config/database';

const router = Router();

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authenticateToken, logout);
router.get('/oauth/google', oauthGoogleStart);
router.get('/oauth/google/callback', oauthGoogleCallback);
router.post('/forgot-password/question', strictLimiter, forgotPasswordGetQuestion);
router.post('/forgot-password/verify', strictLimiter, forgotPasswordVerify);
router.post('/change-password', authenticateToken, changePassword);
router.post('/login-remember', authLimiter, loginWithRememberToken);
router.post('/offline-steps', authenticateToken, addOfflineSteps);
router.post('/update-profile', authenticateToken, updateProfile);

router.get('/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await get('SELECT id, name, email, role, avatar, is_premium, coach_membership_active, membership_paid, medical_history, medical_file_url, points, steps, step_goal, height, weight, gender, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

export default router;
