import { Request, Response } from 'express';
import { query, get, run } from '../config/database';

export const getPosts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role || 'user';
    const tag = (req.query.tag as string) || null;
    // Admins and moderators can see hidden posts; everyone else gets only visible posts
    const hiddenFilter = (userRole === 'admin' || userRole === 'moderator') ? '' : 'AND p.is_hidden = 0';
    let posts;
    if (tag) {
      const like = `%#${tag}%`;
      posts = await query(
        `SELECT p.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role,
                CASE WHEN cf.follower_id IS NOT NULL THEN 1 ELSE 0 END as is_followed,
                CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as isLiked,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN coach_follows cf ON cf.coach_id = p.user_id AND cf.follower_id = ?
         LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = ?
         WHERE (p.hashtags LIKE ? OR p.content LIKE ?) ${hiddenFilter}
         ORDER BY p.is_pinned DESC, is_followed DESC, p.created_at DESC LIMIT 50`, [userId, userId, like, like]);
    } else {
      posts = await query(
        `SELECT p.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role,
                CASE WHEN cf.follower_id IS NOT NULL THEN 1 ELSE 0 END as is_followed,
                CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as isLiked,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN coach_follows cf ON cf.coach_id = p.user_id AND cf.follower_id = ?
         LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = ?
         WHERE 1=1 ${hiddenFilter}
         ORDER BY p.is_pinned DESC, is_followed DESC, p.created_at DESC LIMIT 50`, [userId, userId]);
    }
    // Attach comments to each post
    for (const post of posts as any[]) {
      const comments = await query(
        `SELECT pc.*, u.name as user_name, u.avatar as user_avatar FROM post_comments pc JOIN users u ON pc.user_id = u.id WHERE pc.post_id = ? ORDER BY pc.created_at ASC`, [post.id]
      );
      post.comments = comments;
    }
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user?.role || 'user';
    const postId = req.params.id;
    const post: any = await get('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    // Admins can hide, owners can delete
    if (userRole === 'admin' || userRole === 'moderator') {
      await run('UPDATE posts SET is_hidden = 1 WHERE id = ?', [postId]);
    } else if (post.user_id === userId) {
      await run('DELETE FROM post_comments WHERE post_id = ?', [postId]);
      await run('DELETE FROM post_likes WHERE post_id = ?', [postId]);
      await run('DELETE FROM posts WHERE id = ?', [postId]);
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete post' });
  }
};

export const getTrendingTags = async (_req: Request, res: Response) => {
  try {
    const rows = await query(
      `SELECT hashtags FROM posts WHERE hashtags IS NOT NULL AND hashtags != '' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) ORDER BY created_at DESC LIMIT 200`
    );
    const tagCounts: Record<string, number> = {};
    for (const row of rows as any[]) {
      const tags = (row.hashtags || '').match(/#[\w\u0600-\u06FF]+/g) || [];
      for (const t of tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
    const trending = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
    res.json(trending);
  } catch { res.status(500).json({ message: 'Failed to fetch trending tags' }); }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { content, hashtags } = req.body;
    const files = (req as any).files as Express.Multer.File[] | undefined;
    const mediaUrl = files && files.length > 0 ? `/uploads/${files[0].filename}` : null;
    if (!content && !mediaUrl) return res.status(400).json({ message: 'Content or media is required' });
    const { insertId } = await run('INSERT INTO posts (user_id, content, media_url, hashtags) VALUES (?, ?, ?, ?)', [userId, content, mediaUrl, hashtags]);
    const newPost = await get(`SELECT p.*, u.name as user_name, u.avatar as user_avatar, u.role as user_role FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?`, [insertId]);
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post' });
  }
};

export const getChallenges = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const challenges = await query(
      `SELECT c.*, u.name as creator_name, u.avatar as creator_avatar,
              (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count,
              CASE WHEN cp.user_id IS NOT NULL THEN 1 ELSE 0 END as is_joined
       FROM challenges c
       JOIN users u ON c.creator_id = u.id
       LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = ?
       ORDER BY c.created_at DESC`, [userId]);
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch challenges' });
  }
};

export const createChallenge = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, startDate, endDate } = req.body;
    const imgFiles = (req as any).files as Express.Multer.File[] | undefined;
    const imageUrl = imgFiles && imgFiles.length > 0 ? `/uploads/${imgFiles[0].filename}` : null;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const { insertId } = await run('INSERT INTO challenges (creator_id, title, description, start_date, end_date, image_url) VALUES (?, ?, ?, ?, ?, ?)', [userId, title, description, startDate, endDate, imageUrl]);
    await run('INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)', [insertId, userId]);
    const newChallenge = await get(`SELECT c.*, u.name as creator_name, u.avatar as creator_avatar, (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) as participant_count FROM challenges c JOIN users u ON c.creator_id = u.id WHERE c.id = ?`, [insertId]);
    res.status(201).json(newChallenge);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create challenge' });
  }
};

export const joinChallenge = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const challengeId = req.params.id;
    await run('INSERT IGNORE INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)', [challengeId, userId]);
    res.json({ message: 'Joined challenge successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to join challenge' });
  }
};

export const inviteToChallenge = async (_req: Request, res: Response) => {
  res.json({ message: 'Invitation sent successfully' });
};

export const likePost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const postId = req.params.id;
    await run('INSERT IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
    const countRow: any = await get('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?', [postId]);
    const count = countRow?.count || 0;
    await run('UPDATE posts SET likes = ? WHERE id = ?', [count, postId]);
    res.json({ likes: count });
  } catch (error) {
    res.status(500).json({ message: 'Failed to like post' });
  }
};

export const unlikePost = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const postId = req.params.id;
    await run('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    const countRow: any = await get('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?', [postId]);
    const count = countRow?.count || 0;
    await run('UPDATE posts SET likes = ? WHERE id = ?', [count, postId]);
    res.json({ likes: count });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unlike post' });
  }
};

export const getPostComments = async (req: Request, res: Response) => {
  try {
    const postId = req.params.id;
    const comments = await query(`SELECT pc.*, u.name as user_name, u.avatar as user_avatar FROM post_comments pc JOIN users u ON pc.user_id = u.id WHERE pc.post_id = ? ORDER BY pc.created_at DESC`, [postId]);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const postId = req.params.id;
    const { content } = req.body;
    if (!content.trim()) return res.status(400).json({ message: 'Comment content is required' });
    const { insertId } = await run('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)', [postId, userId, content]);
    const newComment = await get(`SELECT pc.*, u.name as user_name, u.avatar as user_avatar FROM post_comments pc JOIN users u ON pc.user_id = u.id WHERE pc.id = ?`, [insertId]);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

export const followUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const targetUserId = req.params.id;
    if (userId === parseInt(targetUserId)) return res.status(400).json({ message: 'Cannot follow yourself' });
    await run('INSERT IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)', [userId, targetUserId]);
    res.json({ message: 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to follow user' });
  }
};

export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const targetUserId = req.params.id;
    await run('DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?', [userId, targetUserId]);
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unfollow user' });
  }
};

export const requestChat = async (req: Request, res: Response) => {
  return res.status(403).json({
    message: 'Legacy community chat is disabled. Use the main chat module where only admin and subscribed coach-user pairs can chat.'
  });
};

export const acceptChatRequest = async (req: Request, res: Response) => {
  return res.status(403).json({
    message: 'Legacy community chat is disabled. Use the main chat module where only admin and subscribed coach-user pairs can chat.'
  });
};

export const getChatRequests = async (req: Request, res: Response) => {
  return res.json([]);
};

export const getMessages = async (req: Request, res: Response) => {
  return res.status(403).json({
    message: 'Legacy community chat is disabled. Use /api/chat endpoints with enforced subscription/admin rules.'
  });
};

export const sendMessage = async (req: Request, res: Response) => {
  return res.status(403).json({
    message: 'Legacy community chat is disabled. Use /api/chat/send which enforces subscription/admin rules.'
  });
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const currentUserId = (req as any).user.id;
    const user: any = await get('SELECT id, name, avatar, role, points, steps, height, weight FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const followRow = await get('SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?', [currentUserId, userId]);
    // Legacy community chat is disabled; profile should not expose old chat-request state.
    res.json({ ...user, isFollowing: !!followRow, chatStatus: null });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};
