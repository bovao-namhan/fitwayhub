import { Router } from 'express';
import { getMyAnalytics } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/me', authenticateToken, getMyAnalytics);

export default router;
