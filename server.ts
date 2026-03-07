import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';

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
import paymentRoutes from './server/routes/paymentRoutes.js';
import cmsRoutes from './server/routes/cmsRoutes.js';
import meetingRoutes from './server/routes/meetingRoutes.js';
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
  app.use('/api/cms', cmsRoutes);
  app.use('/api/meetings', meetingRoutes);
  console.log('API routes registered');

  // In production serve the built frontend; in dev, run `npx vite` separately
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.use(errorHandler);

  const server = http.createServer(app);

  // ── Socket.io for WebRTC signaling ──────────────────────────────────────
  const io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  const socketUserMap = new Map<string, number>();
  const userSocketsMap = new Map<number, Set<string>>();

  const emitPresence = () => {
    const onlineUserIds = Array.from(userSocketsMap.entries())
      .filter(([, sockets]) => sockets.size > 0)
      .map(([uid]) => uid);
    io.emit('presence:update', { onlineUserIds });
  };

  const identifySocketUser = (socket: any): number | null => {
    try {
      const token = String(socket.handshake?.auth?.token || '').trim();
      if (!token) return null;
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as any;
      const userId = Number(decoded?.id || 0);
      return userId > 0 ? userId : null;
    } catch {
      return null;
    }
  };

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    const userId = identifySocketUser(socket);
    if (userId) {
      socketUserMap.set(socket.id, userId);
      const set = userSocketsMap.get(userId) || new Set<string>();
      set.add(socket.id);
      userSocketsMap.set(userId, set);
      emitPresence();
    }

    socket.on('presence:ping', () => {
      // Connection itself indicates online. Echo full presence snapshot.
      emitPresence();
    });

    socket.on('join-room', (roomId: string, userId: string, userName: string) => {
      socket.join(roomId);
      (socket as any).roomId = roomId;
      (socket as any).meetingUserId = userId;
      (socket as any).meetingUserName = userName;
      socket.to(roomId).emit('user-joined', { socketId: socket.id, userId, userName });
      console.log(`👤 ${userName} joined room ${roomId}`);
    });

    // WebRTC signaling
    socket.on('offer', (data: { to: string; offer: any }) => {
      socket.to(data.to).emit('offer', { from: socket.id, offer: data.offer });
    });

    socket.on('answer', (data: { to: string; answer: any }) => {
      socket.to(data.to).emit('answer', { from: socket.id, answer: data.answer });
    });

    socket.on('ice-candidate', (data: { to: string; candidate: any }) => {
      socket.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate });
    });

    // Media state changes
    socket.on('toggle-audio', (roomId: string, enabled: boolean) => {
      socket.to(roomId).emit('peer-audio-toggled', { socketId: socket.id, enabled });
    });

    socket.on('toggle-video', (roomId: string, enabled: boolean) => {
      socket.to(roomId).emit('peer-video-toggled', { socketId: socket.id, enabled });
    });

    // Chat messages in meeting room
    socket.on('meeting-chat', (roomId: string, msg: { userId: string; userName: string; text: string }) => {
      io.to(roomId).emit('meeting-chat', { ...msg, timestamp: Date.now() });
    });

    // File shared notification
    socket.on('file-shared', (roomId: string, file: any) => {
      socket.to(roomId).emit('file-shared', file);
    });

    // Screen sharing state
    socket.on('screen-sharing', (roomId: string, sharing: boolean) => {
      socket.to(roomId).emit('peer-screen-sharing', { socketId: socket.id, sharing });
    });

    // Typing indicator
    socket.on('typing', (roomId: string, userName: string) => {
      socket.to(roomId).emit('peer-typing', { socketId: socket.id, userName });
    });

    // Notes updated in real-time
    socket.on('notes-updated', (roomId: string, notes: string) => {
      socket.to(roomId).emit('notes-updated', notes);
    });

    socket.on('disconnect', () => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        socket.to(roomId).emit('user-left', { socketId: socket.id, userId: (socket as any).meetingUserId });
      }

      const disconnectedUserId = socketUserMap.get(socket.id);
      if (disconnectedUserId) {
        socketUserMap.delete(socket.id);
        const set = userSocketsMap.get(disconnectedUserId);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) userSocketsMap.delete(disconnectedUserId);
        }
        emitPresence();
      }

      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  server.listen(Number(PORT), '0.0.0.0', () => {
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
