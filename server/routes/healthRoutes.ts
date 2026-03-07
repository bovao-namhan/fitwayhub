import { Router } from 'express';
import { getDailySteps, syncSteps } from '../controllers/healthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get steps (from Google Fit API or local DB)
router.get('/steps/today', authenticateToken, getDailySteps);

// Sync steps (from client/mobile app)
router.post('/steps/sync', authenticateToken, syncSteps);

export default router;
