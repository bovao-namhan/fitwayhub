import { Router } from 'express';
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

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/oauth/google', oauthGoogleStart);
router.get('/oauth/google/callback', oauthGoogleCallback);
router.post('/forgot-password/question', forgotPasswordGetQuestion);
router.post('/forgot-password/verify', forgotPasswordVerify);
router.post('/change-password', authenticateToken, changePassword);
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
