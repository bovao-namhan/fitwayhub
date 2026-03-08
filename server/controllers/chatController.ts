import { Request, Response } from 'express';
import { query, get, run } from '../config/database';

const PRESENCE_TTL_MS = 20_000;
const presenceMap = new Map<number, number>();

function markOnline(userId: number) {
  if (!userId) return;
  presenceMap.set(userId, Date.now());
}

function getOnlineUserSet() {
  const now = Date.now();
  for (const [id, ts] of presenceMap.entries()) {
    if (now - ts > PRESENCE_TTL_MS) presenceMap.delete(id);
  }
  return new Set<number>(presenceMap.keys());
}

async function canDirectChat(senderId: number, senderRole: string, receiverId: number) {
  const receiver = await get('SELECT id, role FROM users WHERE id = ?', [receiverId]) as any;
  if (!receiver) return { ok: false, status: 404, message: 'Recipient not found' };

  // Hide admins from chat for non-admin accounts.
  if (receiver.role === 'admin' && senderRole !== 'admin') {
    return { ok: false, status: 403, message: 'Chat with admin is disabled.' };
  }

  // Admin can still chat with non-admin users when needed.
  if (senderRole === 'admin') {
    return { ok: true, receiverRole: receiver.role };
  }

  if (senderRole === 'user' && receiver.role === 'coach') {
    const activeSub = await get(
      `SELECT id FROM coach_subscriptions
       WHERE user_id = ? AND coach_id = ? AND status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [senderId, receiverId]
    );
    if (!activeSub) {
      return { ok: false, status: 403, message: 'You must subscribe to this coach before chatting. Go to Coaching to subscribe.' };
    }
    return { ok: true, receiverRole: receiver.role };
  }

  if (senderRole === 'coach' && receiver.role === 'user') {
    const activeSub = await get(
      `SELECT id FROM coach_subscriptions
       WHERE user_id = ? AND coach_id = ? AND status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [receiverId, senderId]
    );
    if (!activeSub) {
      return { ok: false, status: 403, message: 'This user does not have an active subscription with you.' };
    }
    return { ok: true, receiverRole: receiver.role };
  }

  if (senderRole === 'user' && receiver.role === 'user') {
    return { ok: false, status: 403, message: 'Direct messaging between users is not available. You can chat only with your subscribed coach.' };
  }

  if (senderRole === 'coach' && receiver.role === 'coach') {
    return { ok: false, status: 403, message: 'Direct messaging between coaches is not available.' };
  }

  return { ok: false, status: 403, message: 'Direct chat is not allowed for this pair.' };
}

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    markOnline(userId);
    const senderRole = (req as any).user.role;
    const otherUserId = Number(req.params.userId);
    if (!otherUserId) return res.status(400).json({ message: 'Invalid user id' });

    const allowed = await canDirectChat(userId, senderRole, otherUserId);
    if (!allowed.ok) return res.status((allowed as any).status).json({ message: (allowed as any).message });

    const messages = await query(`
      SELECT m.*, s.name as sender_name, s.avatar as sender_avatar
      FROM messages m JOIN users s ON m.sender_id = s.id
      WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        AND m.challenge_id IS NULL AND m.group_id IS NULL
      ORDER BY m.created_at ASC
    `, [userId, otherUserId, otherUserId, userId]);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
};

export const getChallengeMessages = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    markOnline(userId);
    const challengeId = req.params.challengeId;
    const participantCheck = await get('SELECT id FROM challenge_participants WHERE challenge_id = ? AND user_id = ?', [challengeId, userId]);
    if (!participantCheck) {
      try { await run('INSERT IGNORE INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)', [challengeId, userId]); } catch {}
    }
    const messages = await query(`
      SELECT m.*, s.name as sender_name, s.avatar as sender_avatar
      FROM messages m JOIN users s ON m.sender_id = s.id
      WHERE m.challenge_id = ? ORDER BY m.created_at ASC
    `, [challengeId]);
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch challenge messages' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const senderId = (req as any).user.id;
    markOnline(senderId);
    const senderRole = (req as any).user.role;
    const { receiverId, challengeId, content } = req.body;
    const mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if ((!receiverId && !challengeId) || (!content && !mediaUrl)) return res.status(400).json({ message: 'Receiver ID or Challenge ID and content/media are required' });

    // Enforce direct-chat rules
    if (receiverId) {
      const allowed = await canDirectChat(senderId, senderRole, Number(receiverId));
      if (!allowed.ok) return res.status((allowed as any).status).json({ message: (allowed as any).message });
    }

    let insertId: number;
    if (challengeId) {
      try { await run('INSERT IGNORE INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)', [challengeId, senderId]); } catch {}
      ({ insertId } = await run('INSERT INTO messages (sender_id, challenge_id, content, media_url) VALUES (?, ?, ?, ?)', [senderId, challengeId, content, mediaUrl]));
    } else {
      ({ insertId } = await run('INSERT INTO messages (sender_id, receiver_id, content, media_url) VALUES (?, ?, ?, ?)', [senderId, receiverId, content, mediaUrl]));
    }
    const newMessage = await get(`
      SELECT m.*, s.name as sender_name, s.avatar as sender_avatar
      FROM messages m JOIN users s ON m.sender_id = s.id WHERE m.id = ?
    `, [insertId]);
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' });
  }
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    markOnline(userId);
    const userRole = (req as any).user.role;
    let contacts: any[] = [];

    if (userRole === 'admin') {
      // Admin sees non-admin accounts only (hide admin users from chat list)
      contacts = await query(
        "SELECT id, name, avatar, role, is_premium FROM users WHERE id != ? AND role != 'admin' ORDER BY name ASC",
        [userId]
      ) as any[];
    } else if (userRole === 'coach') {
      // Coaches see ONLY subscribed athletes
      const athletes = await query(`
        SELECT DISTINCT u.id, u.name, u.avatar, u.role, u.is_premium
        FROM users u
        INNER JOIN coach_subscriptions cs ON cs.user_id = u.id
        WHERE cs.coach_id = ? AND cs.status = 'active' AND (cs.expires_at IS NULL OR cs.expires_at > NOW()) AND u.id != ?
        ORDER BY u.name ASC
      `, [userId, userId]) as any[];
      contacts = athletes;
    } else {
      // Users see ONLY coaches they are subscribed to (no user-to-user chat)
      const subscribedCoaches = await query(`
        SELECT DISTINCT u.id, u.name, u.avatar, u.role, u.is_premium
        FROM users u
        INNER JOIN coach_subscriptions cs ON cs.coach_id = u.id
        WHERE cs.user_id = ? AND cs.status = 'active' AND (cs.expires_at IS NULL OR cs.expires_at > NOW())
        ORDER BY u.name ASC
      `, [userId]) as any[];
      contacts = subscribedCoaches;
    }

    // Final safety net: only return contacts that pass direct-chat policy.
    // This prevents accidental leaks if future query logic changes.
    const filtered: any[] = [];
    for (const c of contacts || []) {
      const allowed = await canDirectChat(userId, userRole, Number(c.id));
      if (allowed.ok) filtered.push(c);
    }

    // De-duplicate by id (in case arrays were merged from multiple sources).
    const uniqueById = Array.from(new Map(filtered.map((u: any) => [u.id, u])).values());
    const onlineSet = getOnlineUserSet();
    res.json({ users: uniqueById.map((u: any) => ({ ...u, online: onlineSet.has(Number(u.id)) })) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

export const pingPresence = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id || 0);
    markOnline(userId);
    // Persist last_active to DB for accuracy across restarts
    await run('UPDATE users SET last_active = NOW() WHERE id = ?', [userId]);
    res.json({ ok: true, ts: Date.now() });
  } catch {
    res.status(500).json({ message: 'Failed to update presence' });
  }
};

export const getPresence = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user?.id || 0);
    markOnline(userId);
    // Combine in-memory presence with DB last_active (within 25s)
    const memoryOnline = Array.from(getOnlineUserSet());
    const dbOnline = await query(
      'SELECT id FROM users WHERE last_active >= DATE_SUB(NOW(), INTERVAL 25 SECOND)',
      []
    ) as any[];
    const combined = new Set(memoryOnline);
    for (const row of dbOnline) combined.add(Number(row.id));
    res.json({ onlineUserIds: Array.from(combined) });
  } catch {
    res.status(500).json({ message: 'Failed to fetch presence' });
  }
};

export const sendMediaMessage = sendMessage;
