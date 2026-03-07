import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  loginWithRememberToken,
  addOfflineSteps,
  updateProfile,
  oauthGoogleStart,
  oauthGoogleCallback,
  oauthFacebookStart,
  oauthFacebookCallback,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { get } from '../config/database';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/oauth/google', oauthGoogleStart);
router.get('/oauth/google/callback', oauthGoogleCallback);
router.get('/oauth/facebook', oauthFacebookStart);
router.get('/oauth/facebook/callback', oauthFacebookCallback);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/login-remember', loginWithRememberToken);
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
