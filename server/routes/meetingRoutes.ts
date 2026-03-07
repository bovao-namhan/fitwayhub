import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { get, run, query } from '../config/database';
import { upload } from '../middleware/upload';
import crypto from 'crypto';

const router = Router();

// ── Create a meeting (coach or user can create, but both must share a subscription) ──
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { participantId, title, scheduledAt } = req.body;
  if (!participantId) return res.status(400).json({ message: 'Participant ID required' });

  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Determine coach_id and user_id based on who's creating
    let coachId: number, athleteId: number;
    if (userRole === 'coach') {
      coachId = userId;
      athleteId = participantId;
    } else {
      athleteId = userId;
      coachId = participantId;
    }

    // Verify subscription exists between them
    const sub = await get(
      'SELECT id FROM coach_subscriptions WHERE user_id = ? AND coach_id = ? AND status = ? AND (expires_at IS NULL OR expires_at > NOW())',
      [athleteId, coachId, 'active']
    );
    if (!sub) return res.status(403).json({ message: 'Active subscription required to create a meeting' });

    const roomId = crypto.randomBytes(16).toString('hex');

    const { insertId } = await run(
      'INSERT INTO coaching_meetings (coach_id, user_id, title, room_id, scheduled_at) VALUES (?, ?, ?, ?, ?)',
      [coachId, athleteId, title || 'Coaching Session', roomId, scheduledAt || null]
    );

    // Notify the other participant
    const creator: any = await get('SELECT name FROM users WHERE id = ?', [userId]);
    const otherUserId = userRole === 'coach' ? athleteId : coachId;
    await run(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [otherUserId, 'meeting_created', '📹 New Meeting Scheduled', `${creator?.name || 'Someone'} scheduled a coaching session${scheduledAt ? ' on ' + new Date(scheduledAt).toLocaleDateString() : ''}.`, `/app/meeting/${roomId}`]
    );

    res.json({ meeting: { id: insertId, roomId, title: title || 'Coaching Session', scheduledAt } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to create meeting' }); }
});

// ── List meetings for current user ──────────────────────────────────────────
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const meetings = await query(
      `SELECT m.*, 
        coach.name as coach_name, coach.avatar as coach_avatar,
        athlete.name as user_name, athlete.avatar as user_avatar,
        (SELECT COUNT(*) FROM meeting_files mf WHERE mf.meeting_id = m.id) as file_count
       FROM coaching_meetings m
       LEFT JOIN users coach ON m.coach_id = coach.id
       LEFT JOIN users athlete ON m.user_id = athlete.id
       WHERE m.coach_id = ? OR m.user_id = ?
       ORDER BY COALESCE(m.scheduled_at, m.created_at) DESC`,
      [req.user.id, req.user.id]
    );
    res.json({ meetings });
  } catch { res.status(500).json({ message: 'Failed to fetch meetings' }); }
});

// ── Get single meeting details ──────────────────────────────────────────────
router.get('/:roomId', authenticateToken, async (req: any, res: Response) => {
  try {
    const meeting: any = await get(
      `SELECT m.*, 
        coach.name as coach_name, coach.avatar as coach_avatar, coach.email as coach_email,
        athlete.name as user_name, athlete.avatar as user_avatar, athlete.email as user_email
       FROM coaching_meetings m
       LEFT JOIN users coach ON m.coach_id = coach.id
       LEFT JOIN users athlete ON m.user_id = athlete.id
       WHERE m.room_id = ?`,
      [req.params.roomId]
    );
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this meeting' });
    }

    const files = await query(
      `SELECT mf.*, u.name as uploader_name FROM meeting_files mf LEFT JOIN users u ON mf.uploaded_by = u.id WHERE mf.meeting_id = ? ORDER BY mf.created_at DESC`,
      [meeting.id]
    );

    const messages = await query(
      `SELECT mm.*, u.name as user_name, u.avatar as user_avatar FROM meeting_messages mm LEFT JOIN users u ON mm.user_id = u.id WHERE mm.meeting_id = ? ORDER BY mm.created_at ASC`,
      [meeting.id]
    );

    res.json({ meeting, files, messages });
  } catch { res.status(500).json({ message: 'Failed to fetch meeting' }); }
});

// ── Start a meeting ─────────────────────────────────────────────────────────
router.patch('/:roomId/start', authenticateToken, async (req: any, res: Response) => {
  try {
    const meeting: any = await get('SELECT * FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await run('UPDATE coaching_meetings SET status = ?, started_at = NOW() WHERE room_id = ?', ['active', req.params.roomId]);
    res.json({ message: 'Meeting started' });
  } catch { res.status(500).json({ message: 'Failed to start meeting' }); }
});

// ── End a meeting ───────────────────────────────────────────────────────────
router.patch('/:roomId/end', authenticateToken, async (req: any, res: Response) => {
  try {
    const meeting: any = await get('SELECT * FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await run('UPDATE coaching_meetings SET status = ?, ended_at = NOW() WHERE room_id = ?', ['ended', req.params.roomId]);
    res.json({ message: 'Meeting ended' });
  } catch { res.status(500).json({ message: 'Failed to end meeting' }); }
});

// ── Cancel / delete a meeting ───────────────────────────────────────────────
router.delete('/:roomId', authenticateToken, async (req: any, res: Response) => {
  try {
    const meeting: any = await get('SELECT * FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (meeting.status === 'active') {
      return res.status(400).json({ message: 'Cannot delete an active meeting. End it first.' });
    }

    // Delete cascade will handle files & messages
    await run('DELETE FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);

    // Notify the other participant
    const creator: any = await get('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const otherUserId = req.user.id === meeting.coach_id ? meeting.user_id : meeting.coach_id;
    await run(
      'INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)',
      [otherUserId, 'meeting_cancelled', '❌ Meeting Cancelled', `${creator?.name || 'Someone'} cancelled the meeting "${meeting.title}".`]
    );

    res.json({ message: 'Meeting deleted' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to delete meeting' }); }
});

// ── Save / update meeting notes ─────────────────────────────────────────────
router.patch('/:roomId/notes', authenticateToken, async (req: any, res: Response) => {
  const { notes } = req.body;
  try {
    const meeting: any = await get('SELECT * FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await run('UPDATE coaching_meetings SET notes = ? WHERE room_id = ?', [notes ?? '', req.params.roomId]);
    res.json({ message: 'Notes saved' });
  } catch { res.status(500).json({ message: 'Failed to save notes' }); }
});

// ── Reschedule a meeting ────────────────────────────────────────────────────
router.patch('/:roomId/reschedule', authenticateToken, async (req: any, res: Response) => {
  const { scheduledAt } = req.body;
  if (!scheduledAt) return res.status(400).json({ message: 'New schedule required' });
  try {
    const meeting: any = await get('SELECT * FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (meeting.status !== 'scheduled') {
      return res.status(400).json({ message: 'Can only reschedule meetings that haven\'t started' });
    }
    await run('UPDATE coaching_meetings SET scheduled_at = ? WHERE room_id = ?', [scheduledAt, req.params.roomId]);

    const creator: any = await get('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const otherUserId = req.user.id === meeting.coach_id ? meeting.user_id : meeting.coach_id;
    await run(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [otherUserId, 'meeting_rescheduled', '📅 Meeting Rescheduled', `${creator?.name || 'Someone'} rescheduled "${meeting.title}" to ${new Date(scheduledAt).toLocaleString()}.`, `/app/meeting/${meeting.room_id}`]
    );

    res.json({ message: 'Meeting rescheduled', scheduledAt });
  } catch { res.status(500).json({ message: 'Failed to reschedule meeting' }); }
});

// ── Upload file to meeting ──────────────────────────────────────────────────
router.post('/:roomId/files', authenticateToken, upload.single('file'), async (req: any, res: Response) => {
  try {
    const meeting: any = await get('SELECT * FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const fileUrl = `/uploads/${req.file.filename}`;
    const { insertId } = await run(
      'INSERT INTO meeting_files (meeting_id, uploaded_by, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
      [meeting.id, req.user.id, req.file.originalname, fileUrl, req.file.mimetype, req.file.size]
    );

    const file = await get('SELECT mf.*, u.name as uploader_name FROM meeting_files mf LEFT JOIN users u ON mf.uploaded_by = u.id WHERE mf.id = ?', [insertId]);
    res.json({ file });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to upload file' }); }
});

// ── Send chat message in meeting ────────────────────────────────────────────
router.post('/:roomId/messages', authenticateToken, async (req: any, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

  try {
    const meeting: any = await get('SELECT * FROM coaching_meetings WHERE room_id = ?', [req.params.roomId]);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    if (meeting.coach_id !== req.user.id && meeting.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { insertId } = await run(
      'INSERT INTO meeting_messages (meeting_id, user_id, message) VALUES (?, ?, ?)',
      [meeting.id, req.user.id, message.trim()]
    );

    const msg = await get(
      'SELECT mm.*, u.name as user_name, u.avatar as user_avatar FROM meeting_messages mm LEFT JOIN users u ON mm.user_id = u.id WHERE mm.id = ?',
      [insertId]
    );
    res.json({ message: msg });
  } catch { res.status(500).json({ message: 'Failed to send message' }); }
});

export default router;
