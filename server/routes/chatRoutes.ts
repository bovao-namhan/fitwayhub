import express from 'express';
import { getChatHistory, sendMessage, getContacts, getChallengeMessages, sendMediaMessage, pingPresence, getPresence } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';
import upload from '../middleware/upload';

const router = express.Router();

// Frontend calls these endpoints:
router.get('/users', authenticateToken, getContacts);                              // GET /api/chat/users
router.get('/contacts', authenticateToken, getContacts);                           // GET /api/chat/contacts (alias)
router.get('/messages/:userId', authenticateToken, getChatHistory);                // GET /api/chat/messages/:id
router.get('/history/:userId', authenticateToken, getChatHistory);                 // GET /api/chat/history/:userId (alias)
router.get('/challenge/:challengeId/messages', authenticateToken, getChallengeMessages); // GET /api/chat/challenge/:id/messages
router.get('/challenge/:challengeId', authenticateToken, getChallengeMessages);    // alias
router.post('/send', authenticateToken, sendMessage);                              // POST /api/chat/send
router.post('/send-media', authenticateToken, upload.single('file'), sendMessage); // POST /api/chat/send-media
router.post('/presence/ping', authenticateToken, pingPresence);                    // POST /api/chat/presence/ping
router.get('/presence', authenticateToken, getPresence);                           // GET /api/chat/presence

export default router;
