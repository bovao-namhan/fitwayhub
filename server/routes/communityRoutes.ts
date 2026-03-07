import express from 'express';
import { 
  getPosts, createPost, getChallenges, createChallenge, joinChallenge, inviteToChallenge,
  likePost, unlikePost, getPostComments, addComment, followUser, unfollowUser,
  requestChat, acceptChatRequest, getChatRequests, getMessages, sendMessage, getUserProfile,
  deletePost, getTrendingTags
} from '../controllers/communityController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Use .any() to accept any file field name without "Unexpected field" errors
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

router.get('/posts', authenticateToken, getPosts);
router.post('/posts', authenticateToken, upload.any(), createPost);
router.delete('/posts/:id', authenticateToken, deletePost);
router.get('/posts/trending-tags', authenticateToken, getTrendingTags);
router.post('/posts/:id/like', authenticateToken, likePost);
router.delete('/posts/:id/like', authenticateToken, unlikePost);
router.get('/posts/:id/comments', authenticateToken, getPostComments);
router.post('/posts/:id/comments', authenticateToken, addComment);

router.get('/challenges', authenticateToken, getChallenges);
router.post('/challenges', authenticateToken, upload.any(), createChallenge);
router.post('/challenges/:id/join', authenticateToken, joinChallenge);
router.post('/challenges/:id/invite', authenticateToken, inviteToChallenge);

router.post('/users/:id/follow', authenticateToken, followUser);
router.delete('/users/:id/follow', authenticateToken, unfollowUser);
router.post('/users/:id/chat', authenticateToken, requestChat);
router.post('/chat-requests/:id/accept', authenticateToken, acceptChatRequest);
router.get('/chat-requests', authenticateToken, getChatRequests);
router.get('/messages', authenticateToken, getMessages);
router.post('/messages', authenticateToken, sendMessage);
router.get('/users/:id/profile', authenticateToken, getUserProfile);

export default router;

// Community stats (admin only)
router.get('/stats', authenticateToken, async (req: any, res: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  try {
    const { query } = await import('../config/database');
    const [postRow]: any = await query('SELECT COUNT(*) as cnt FROM posts');
    const [likeRow]: any = await query('SELECT COUNT(*) as cnt FROM post_likes');
    const [commentRow]: any = await query('SELECT COUNT(*) as cnt FROM post_comments');
    const [challengeRow]: any = await query('SELECT COUNT(*) as cnt FROM challenges');
    const [userRow]: any = await query("SELECT COUNT(DISTINCT user_id) as cnt FROM posts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    res.json({ total_posts: (postRow as any)?.cnt || 0, total_likes: (likeRow as any)?.cnt || 0, total_comments: (commentRow as any)?.cnt || 0, total_challenges: (challengeRow as any)?.cnt || 0, active_users: (userRow as any)?.cnt || 0 });
  } catch { res.status(500).json({ message: 'Failed to fetch stats' }); }
});
