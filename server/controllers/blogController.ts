import { Request, Response } from 'express';
import { get, query, run } from '../config/database';

const WRITER_ROLES = new Set(['coach', 'admin']);

type BlogStatus = 'draft' | 'published';

function toSlug(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

async function uniqueSlug(base: string, ignoreId?: number, language: string = 'en'): Promise<string> {
  const safeBase = base || `post-${Date.now()}`;
  let slug = safeBase;
  let i = 1;

  while (true) {
    const row = await get<any>('SELECT id FROM blog_posts WHERE slug = ? AND language = ?', [slug, language]);
    if (!row || (ignoreId && Number(row.id) === Number(ignoreId))) return slug;
    slug = `${safeBase}-${i++}`;
  }
}

function canWrite(role: string): boolean {
  return WRITER_ROLES.has(role);
}

function computeMediaPath(file?: Express.Multer.File): string | null {
  if (!file?.filename) return null;
  return `/uploads/${file.filename}`;
}

export const getPublicBlogs = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);
    const q = String(req.query.q || '').trim();
    const lang = String(req.query.lang || 'en').trim();

    const where: string[] = ['bp.status = "published"', 'bp.language = ?'];
    const params: any[] = [lang];

    if (q) {
      where.push('(bp.title LIKE ? OR bp.excerpt LIKE ? OR bp.content LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const posts = await query(
      `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.content, bp.header_image_url, bp.video_url,
              bp.video_duration, bp.language, bp.related_blog_id, bp.status, bp.author_id, bp.author_role, 
              bp.created_at, bp.updated_at, bp.published_at,
              u.name AS author_name, u.avatar AS author_avatar
       FROM blog_posts bp
       JOIN users u ON u.id = bp.author_id
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(bp.published_at, bp.created_at) DESC
       LIMIT ${limit}`,
      params
    );

    res.json({ posts });
  } catch (err) {
    console.error('getPublicBlogs error:', err);
    res.status(500).json({ message: 'Failed to fetch public blogs' });
  }
};

export const getPublicBlogBySlug = async (req: Request, res: Response) => {
  try {
    const key = String(req.params.slug || '').trim();
    const lang = String(req.query.lang || 'en').trim();
    if (!key) return res.status(400).json({ message: 'Blog slug is required' });

    const byId = Number(key);
    const post = Number.isFinite(byId) && byId > 0
      ? await get<any>(
        `SELECT bp.*, u.name AS author_name, u.avatar AS author_avatar
         FROM blog_posts bp
         JOIN users u ON u.id = bp.author_id
         WHERE bp.id = ? AND bp.language = ? AND bp.status = 'published'`,
        [byId, lang]
      )
      : await get<any>(
        `SELECT bp.*, u.name AS author_name, u.avatar AS author_avatar
         FROM blog_posts bp
         JOIN users u ON u.id = bp.author_id
         WHERE bp.slug = ? AND bp.language = ? AND bp.status = 'published'`,
        [key, lang]
      );

    if (!post) return res.status(404).json({ message: 'Blog post not found' });
    res.json({ post });
  } catch {
    res.status(500).json({ message: 'Failed to fetch blog post' });
  }
};

export const getBlogs = async (req: Request, res: Response) => {
  try {
    const role = (req as any).user?.role || 'user';
    const userId = Number((req as any).user?.id || 0);
    const mode = String(req.query.mode || 'feed');
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 60), 1), 150);

    const where: string[] = [];
    const params: any[] = [];

    if (mode === 'manage') {
      if (role === 'admin') {
        // Admin can manage all posts.
      } else if (role === 'coach') {
        where.push('bp.author_id = ?');
        params.push(userId);
      } else {
        return res.status(403).json({ message: 'Only coaches and admins can manage blog posts' });
      }
    } else {
      where.push("bp.status = 'published'");
    }

    if (q) {
      where.push('(bp.title LIKE ? OR bp.excerpt LIKE ? OR bp.content LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const posts = await query(
      `SELECT bp.id, bp.title, bp.slug, bp.excerpt, bp.content, bp.header_image_url, bp.video_url,
              bp.video_duration, bp.language, bp.related_blog_id, bp.status, bp.author_id, bp.author_role, 
              bp.created_at, bp.updated_at, bp.published_at,
              u.name AS author_name, u.avatar AS author_avatar
       FROM blog_posts bp
       JOIN users u ON u.id = bp.author_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY COALESCE(bp.published_at, bp.created_at) DESC, bp.updated_at DESC
       LIMIT ${limit}`,
      params
    );

    res.json({ posts });
  } catch {
    res.status(500).json({ message: 'Failed to fetch blog posts' });
  }
};

export const createBlog = async (req: Request, res: Response) => {
  try {
    const role = (req as any).user?.role || 'user';
    const userId = Number((req as any).user?.id || 0);

    if (!canWrite(role)) {
      return res.status(403).json({ message: 'Only coaches and admins can create blog posts' });
    }

    const files = (req as any).files as { [fieldName: string]: Express.Multer.File[] } | undefined;
    const headerImage = computeMediaPath(files?.headerImage?.[0]);
    const video = computeMediaPath(files?.video?.[0]);

    const title = String(req.body.title || '').trim();
    const excerpt = String(req.body.excerpt || '').trim();
    const content = String(req.body.content || '').trim();
    const videoDuration = parseInt(req.body.videoDuration || '0') || null;
    const language = String(req.body.language || 'en').trim().toLowerCase();
    const relatedBlogId = req.body.relatedBlogId ? Number(req.body.relatedBlogId) : null;
    const status: BlogStatus = req.body.status === 'draft' ? 'draft' : 'published';

    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!content) return res.status(400).json({ message: 'Content is required' });
    if (!['en', 'ar'].includes(language)) {
      return res.status(400).json({ message: 'Language must be "en" or "ar"' });
    }

    // Validate relatedBlogId if provided
    if (relatedBlogId) {
      const relatedPost = await get<any>('SELECT id, language FROM blog_posts WHERE id = ?', [relatedBlogId]);
      if (!relatedPost) {
        return res.status(400).json({ message: 'Related blog post not found' });
      }
      if (relatedPost.language === language) {
        return res.status(400).json({ message: 'Related blog must be in a different language' });
      }
    }

    const slugBase = toSlug(title);
    const slug = await uniqueSlug(slugBase, undefined, language);
    const publishedAt = status === 'published' ? new Date() : null;

    const { insertId } = await run(
      `INSERT INTO blog_posts
        (title, slug, excerpt, content, header_image_url, video_url, video_duration, language, related_blog_id, status, author_id, author_role, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, excerpt, content, headerImage, video, videoDuration, language, relatedBlogId, status, userId, role, publishedAt]
    );

    const post = await get<any>(
      `SELECT bp.*, u.name AS author_name, u.avatar AS author_avatar
       FROM blog_posts bp
       JOIN users u ON u.id = bp.author_id
       WHERE bp.id = ?`,
      [insertId]
    );

    res.status(201).json({ post });
  } catch (err) {
    console.error('createBlog error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to create blog post';
    res.status(500).json({ message: 'Failed to create blog post', error: errorMessage });
  }
};

export const updateBlog = async (req: Request, res: Response) => {
  try {
    const role = (req as any).user?.role || 'user';
    const userId = Number((req as any).user?.id || 0);
    const postId = Number(req.params.id || 0);

    if (!postId) return res.status(400).json({ message: 'Invalid blog post id' });
    if (!canWrite(role)) {
      return res.status(403).json({ message: 'Only coaches and admins can update blog posts' });
    }

    const existing = await get<any>('SELECT * FROM blog_posts WHERE id = ?', [postId]);
    if (!existing) return res.status(404).json({ message: 'Blog post not found' });

    if (role !== 'admin' && Number(existing.author_id) !== userId) {
      return res.status(403).json({ message: 'You can only edit your own blog posts' });
    }

    const files = (req as any).files as { [fieldName: string]: Express.Multer.File[] } | undefined;
    const headerImage = computeMediaPath(files?.headerImage?.[0]);
    const video = computeMediaPath(files?.video?.[0]);

    const title = String(req.body.title ?? existing.title).trim();
    const excerpt = String(req.body.excerpt ?? existing.excerpt ?? '').trim();
    const content = String(req.body.content ?? existing.content ?? '').trim();
    const videoDuration = parseInt(req.body.videoDuration ?? existing.video_duration ?? '0') || null;
    const language = existing.language || 'en'; // Don't allow changing language
    const relatedBlogId = req.body.relatedBlogId ? Number(req.body.relatedBlogId) : existing.related_blog_id;
    const status: BlogStatus = req.body.status === 'draft' ? 'draft' : 'published';

    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!content) return res.status(400).json({ message: 'Content is required' });

    const slugBase = toSlug(title);
    const slug = title === existing.title ? existing.slug : await uniqueSlug(slugBase, postId, language);

    const nextHeaderImage = req.body.removeHeaderImage === '1'
      ? null
      : (headerImage ?? existing.header_image_url ?? null);

    const nextVideo = req.body.removeVideo === '1'
      ? null
      : (video ?? existing.video_url ?? null);

    const publishedAt = status === 'published'
      ? (existing.published_at || new Date())
      : null;

    await run(
      `UPDATE blog_posts
       SET title = ?, slug = ?, excerpt = ?, content = ?, header_image_url = ?, video_url = ?, video_duration = ?,
           related_blog_id = ?, status = ?, published_at = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, slug, excerpt, content, nextHeaderImage, nextVideo, videoDuration, relatedBlogId, status, publishedAt, postId]
    );

    const post = await get<any>(
      `SELECT bp.*, u.name AS author_name, u.avatar AS author_avatar
       FROM blog_posts bp
       JOIN users u ON u.id = bp.author_id
       WHERE bp.id = ?`,
      [postId]
    );

    res.json({ post });
  } catch (err) {
    console.error('updateBlog error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to update blog post';
    res.status(500).json({ message: 'Failed to update blog post', error: errorMessage });
  }
};

export const deleteBlog = async (req: Request, res: Response) => {
  try {
    const role = (req as any).user?.role || 'user';
    const userId = Number((req as any).user?.id || 0);
    const postId = Number(req.params.id || 0);

    if (!postId) return res.status(400).json({ message: 'Invalid blog post id' });

    const existing = await get<any>('SELECT id, author_id FROM blog_posts WHERE id = ?', [postId]);
    if (!existing) return res.status(404).json({ message: 'Blog post not found' });

    if (role !== 'admin' && Number(existing.author_id) !== userId) {
      return res.status(403).json({ message: 'You can only delete your own blog posts' });
    }

    await run('DELETE FROM blog_posts WHERE id = ?', [postId]);
    res.json({ message: 'Blog post deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete blog post' });
  }
};
