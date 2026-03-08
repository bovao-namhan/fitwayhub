import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const envResult = dotenv.config();
if (envResult.error) {
  dotenv.config({ path: 'env.txt' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './server/routes/authRoutes.js';
import healthRoutes from './server/routes/healthRoutes.js';
import aiRoutes from './server/routes/aiRoutes.js';
import chatRoutes from './server/routes/chatRoutes.js';
import communityRoutes from './server/routes/communityRoutes.js';
import stepsRoutes from './server/routes/stepsRoutes.js';
import trackRoutes from './server/routes/trackRoutes.js';
import analyticsRoutes from './server/routes/analyticsRoutes.js';
import coachingRoutes from './server/routes/coachingRoutes.js';
import adminRoutes from './server/routes/adminRoutes.js';
import coachRoutes from './server/routes/coachRoutes2.js';
import userRoutes from './server/routes/userRoutes.js';
import workoutsRoutes from './server/routes/workoutsRoutes.js';
import plansRoutes from './server/routes/plansRoutes.js';
import paymentRoutes from './server/routes/paymentRoutes.js';
import cmsRoutes from './server/routes/cmsRoutes.js';
import meetingRoutes from './server/routes/meetingRoutes.js';
import blogRoutes from './server/routes/blogRoutes.js';
import { errorHandler } from './server/middleware/error.js';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://peter-adel.taila6a2b4.ts.net',
  'http://peter-adel.taila6a2b4.ts.net',
  'http://peter-adel.taila6a2b4.ts.net',
];

async function startServer() {
  // Initialize MySQL
  const { initDatabase } = await import("./server/config/database.js");
  await initDatabase();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.taila6a2b4.ts.net') || origin.endsWith('.ngrok-free.dev')) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all in dev — tighten in prod
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(morgan('dev'));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  console.log('Registering API routes...');
  app.use('/api/auth', (req: any, res: any, next: any) => {
    console.log(`Auth request: ${req.method} ${req.url}`);
    next();
  }, authRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/steps', stepsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/track', trackRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/coaching', coachingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/coach', coachRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/workouts', workoutsRoutes);
  app.use('/api/plans', plansRoutes);
  app.use('/api/cms', cmsRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/blogs', blogRoutes);
  console.log('API routes registered');

  // In production serve the built frontend; in dev, run `npx vite` separately
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.use(errorHandler);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n🏋️  FitWay Hub Server running on port ${PORT}`);
    console.log(`📱  Local:    http://localhost:${PORT}`);
    console.log(`🌐  Network: https://peter-adel.taila6a2b4.ts.net`);
    console.log(`🔑  Admin:   peteradmin@example.com / peterishere`);
    console.log(`🏅  Coach:   petercoach@example.com / peterishere`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n📦  Run frontend: npx vite --host 0.0.0.0`);
    }
    console.log(`\n▶  Run seed: npx tsx server/seed.ts\n`);
  });
}

startServer();

export default startServer;
