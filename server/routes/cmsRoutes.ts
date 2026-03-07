import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { query, get, run } from '../config/database';
import { upload } from '../middleware/upload';

const router = Router();

const adminOnly = (req: any, res: Response, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// ── Public: get sections for a page ──────────────────────────────────────────
router.get('/sections/:page', async (req: any, res: Response) => {
  try {
    const { page } = req.params;
    const sections = await query(
      'SELECT * FROM website_sections WHERE page = ? AND is_visible = 1 ORDER BY sort_order ASC',
      [page]
    );
    const parsed = (sections as any[]).map(s => ({
      ...s,
      content: typeof s.content === 'string' ? JSON.parse(s.content) : s.content,
    }));
    res.json({ sections: parsed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sections' });
  }
});

// ── Admin: get ALL sections for a page (including hidden) ─────────────────────
router.get('/admin/sections/:page', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    const { page } = req.params;
    const sections = await query(
      'SELECT * FROM website_sections WHERE page = ? ORDER BY sort_order ASC',
      [page]
    );
    const parsed = (sections as any[]).map(s => ({
      ...s,
      content: typeof s.content === 'string' ? JSON.parse(s.content) : s.content,
    }));
    res.json({ sections: parsed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sections' });
  }
});

// ── Admin: create section ─────────────────────────────────────────────────────
router.post('/admin/sections', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { page, type, label, content, sort_order } = req.body;
  if (!page || !type || !label) return res.status(400).json({ message: 'page, type, label required' });
  try {
    const maxOrder: any = await get('SELECT MAX(sort_order) as max FROM website_sections WHERE page = ?', [page]);
    const order = sort_order ?? ((maxOrder?.max || 0) + 1);
    const { insertId } = await run(
      'INSERT INTO website_sections (page, type, label, content, sort_order) VALUES (?,?,?,?,?)',
      [page, type, label, JSON.stringify(content || {}), order]
    );
    const section: any = await get('SELECT * FROM website_sections WHERE id = ?', [insertId]);
    res.json({ section: { ...section, content: JSON.parse(section.content) } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create section' });
  }
});

// ── Admin: update section content ─────────────────────────────────────────────
router.put('/admin/sections/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { id } = req.params;
  const { label, content, is_visible, sort_order, type } = req.body;
  try {
    const fields: string[] = [];
    const values: any[] = [];
    if (label !== undefined)      { fields.push('label = ?');      values.push(label); }
    if (content !== undefined)    { fields.push('content = ?');    values.push(JSON.stringify(content)); }
    if (is_visible !== undefined) { fields.push('is_visible = ?'); values.push(is_visible ? 1 : 0); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    if (type !== undefined)       { fields.push('type = ?');       values.push(type); }
    if (fields.length === 0) return res.status(400).json({ message: 'No fields' });
    values.push(id);
    await run(`UPDATE website_sections SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    const updated: any = await get('SELECT * FROM website_sections WHERE id = ?', [id]);
    res.json({ section: { ...updated, content: typeof updated.content === 'string' ? JSON.parse(updated.content) : updated.content } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update section' });
  }
});

// ── Admin: reorder sections ───────────────────────────────────────────────────
router.post('/admin/sections/reorder', authenticateToken, adminOnly, async (req: any, res: Response) => {
  const { orders } = req.body; // [{ id, sort_order }]
  if (!Array.isArray(orders)) return res.status(400).json({ message: 'orders array required' });
  try {
    for (const { id, sort_order } of orders) {
      await run('UPDATE website_sections SET sort_order = ? WHERE id = ?', [sort_order, id]);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reorder' });
  }
});

// ── Admin: delete section ─────────────────────────────────────────────────────
router.delete('/admin/sections/:id', authenticateToken, adminOnly, async (req: any, res: Response) => {
  try {
    await run('DELETE FROM website_sections WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete section' });
  }
});

// ── Admin: upload image for section ──────────────────────────────────────────
router.post('/admin/upload-image', authenticateToken, adminOnly, upload.single('image'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default router;
