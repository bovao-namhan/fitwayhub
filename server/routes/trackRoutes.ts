import express from 'express';
import { saveSession } from '../controllers/trackController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/sessions', authenticateToken, saveSession);

export default router;
