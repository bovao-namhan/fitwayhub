import { Router } from 'express';
import { analyzeSteps } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: 'Too many AI requests from this IP, please try again later'
});

router.post('/analyze-steps', authenticateToken, aiLimiter, analyzeSteps);

export default router;
