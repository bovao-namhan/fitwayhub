import { Router, Response } from 'express';
import { bookSession } from '../controllers/coachingController';
import { authenticateToken, requireActiveCoachMembershipForDeals } from '../middleware/auth';
import { upload, optimizeImage } from '../middleware/upload';
import { get, run, query } from '../config/database';

const router = Router();

router.post('/book', authenticateToken, upload.fields([{ name: 'nowBodyPhoto', maxCount: 1 }, { name: 'dreamBodyPhoto', maxCount: 1 }]), optimizeImage(), bookSession);

router.get('/reviews/:coachId', authenticateToken, async (req: any, res: Response) => {
  try {
    const reviews = await query(`SELECT r.id, r.rating, r.text, r.created_at, u.name as userName FROM coach_reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.coach_id = ? ORDER BY r.created_at DESC LIMIT 50`, [req.params.coachId]);
    res.json({ reviews });
  } catch { res.status(500).json({ message: 'Failed to fetch reviews' }); }
});

router.post('/reviews', authenticateToken, async (req: any, res: Response) => {
  const { coachId, rating, text } = req.body;
  if (!coachId || !rating || !text?.trim()) return res.status(400).json({ message: 'Coach ID, rating, and text are required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  try {
    const existing = await get('SELECT id FROM coach_reviews WHERE coach_id = ? AND user_id = ?', [coachId, req.user.id]);
    if (existing) {
      await run('UPDATE coach_reviews SET rating = ?, text = ?, created_at = NOW() WHERE coach_id = ? AND user_id = ?', [rating, text.trim(), coachId, req.user.id]);
    } else {
      await run('INSERT INTO coach_reviews (coach_id, user_id, rating, text) VALUES (?, ?, ?, ?)', [coachId, req.user.id, rating, text.trim()]);
    }
    res.json({ message: 'Review submitted successfully' });
  } catch { res.status(500).json({ message: 'Failed to submit review' }); }
});

router.get('/coaches', authenticateToken, async (_req: any, res: Response) => {
  try {
    // Show all coaches with role=coach, including those with no profile yet
    // membership_paid coaches appear first, then others
    const coaches = await query(`
      SELECT u.id, u.name, u.email, u.avatar, u.role,
        u.membership_paid, u.coach_membership_active,
        COALESCE(cp.bio, '') as bio, 
        COALESCE(cp.specialty, 'General Fitness') as specialty,
        COALESCE(cp.location, '') as location,
        COALESCE(cp.price, 50) as price,
        COALESCE(cp.available, 1) as available,
        COALESCE(cp.sessions_count, 0) as sessions_count,
        COALESCE(cp.plan_types, 'complete') as plan_types,
        COALESCE(cp.monthly_price, 0) as monthly_price,
        COALESCE(cp.yearly_price, 0) as yearly_price,
        COALESCE(AVG(cr.rating), 0) as rating,
        COUNT(DISTINCT cr.id) as review_count
      FROM users u
      LEFT JOIN coach_profiles cp ON u.id = cp.user_id
      LEFT JOIN coach_reviews cr ON u.id = cr.coach_id
      WHERE u.role = 'coach'
      GROUP BY u.id
      ORDER BY u.membership_paid DESC, rating DESC, u.created_at ASC
    `);
    res.json({ coaches });
  } catch { res.status(500).json({ message: 'Failed to fetch coaches' }); }
});

router.get('/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    const profile = await get('SELECT * FROM coach_profiles WHERE user_id = ?', [req.user.id]);
    res.json({ profile });
  } catch { res.status(500).json({ message: 'Failed to fetch profile' }); }
});

router.post('/profile', authenticateToken, async (req: any, res: Response) => {
  const { bio, specialty, location, price, available, planTypes, monthlyPrice, yearlyPrice } = req.body;
  try {
    const existing = await get('SELECT id FROM coach_profiles WHERE user_id = ?', [req.user.id]);
    if (existing) {
      await run('UPDATE coach_profiles SET bio=?, specialty=?, location=?, price=?, available=?, plan_types=?, monthly_price=?, yearly_price=? WHERE user_id=?',
        [bio || '', specialty || '', location || '', price || 50, available ? 1 : 0, planTypes || 'complete', monthlyPrice || 0, yearlyPrice || 0, req.user.id]);
    } else {
      await run('INSERT INTO coach_profiles (user_id, bio, specialty, location, price, available, plan_types, monthly_price, yearly_price) VALUES (?,?,?,?,?,?,?,?,?)',
        [req.user.id, bio || '', specialty || '', location || '', price || 50, available ? 1 : 0, planTypes || 'complete', monthlyPrice || 0, yearlyPrice || 0]);
    }
    res.json({ message: 'Profile updated' });
  } catch { res.status(500).json({ message: 'Failed to update profile' }); }
});

router.get('/requests', authenticateToken, async (req: any, res: Response) => {
  try {
    const bookings = await query(`SELECT b.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar FROM coaching_bookings b LEFT JOIN users u ON b.user_id = u.id WHERE b.coach_id = ? ORDER BY b.created_at DESC`, [req.user.id]);
    res.json({ requests: bookings });
  } catch { res.status(500).json({ message: 'Failed to fetch requests' }); }
});

router.patch('/requests/:id/status', authenticateToken, requireActiveCoachMembershipForDeals, async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    // Set amount from coach profile price when accepting
    const booking: any = await get('SELECT cb.*, cp.price FROM coaching_bookings cb LEFT JOIN coach_profiles cp ON cb.coach_id = cp.user_id WHERE cb.id = ? AND cb.coach_id = ?', [id, req.user.id]);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const amount = booking.price || 0;
    const completedAt = status === 'accepted' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null;
    await run('UPDATE coaching_bookings SET status = ?, amount = ?, completed_at = ? WHERE id = ? AND coach_id = ?',
      [status, status === 'accepted' ? amount : 0, completedAt, id, req.user.id]);

    // Create notification for the athlete
    const notifTitle = status === 'accepted' ? 'Coaching Request Accepted! 🎉' : 'Coaching Request Update';
    const notifBody = status === 'accepted'
      ? `Your coaching request has been accepted. Your coach will reach out soon.`
      : `Your coaching request was reviewed. Please reach out for more info.`;
    await run('INSERT INTO notifications (user_id, type, title, body, link) VALUES (?,?,?,?,?)',
      [booking.user_id, status === 'accepted' ? 'booking_accepted' : 'booking_rejected', notifTitle, notifBody, '/app/coaching']);

    res.json({ message: 'Status updated' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to update status' }); }
});

// Get current user's accepted coach
router.get('/my-coach', authenticateToken, async (req: any, res: any) => {
  try {
    const booking = await get<any>(
      `SELECT cb.*, u.name as coach_name, u.avatar as coach_avatar, u.email as coach_email,
       cp.specialty, cp.bio, cp.price
       FROM coaching_bookings cb
       LEFT JOIN users u ON cb.coach_id = u.id
       LEFT JOIN coach_profiles cp ON cp.user_id = u.id
       WHERE cb.user_id = ? AND cb.status = 'accepted'
       ORDER BY cb.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!booking) return res.json({ coach: null });
    res.json({ coach: { id: booking.coach_id, name: booking.coach_name, avatar: booking.coach_avatar, email: booking.coach_email, specialty: booking.specialty, bio: booking.bio, price: booking.price } });
  } catch { res.status(500).json({ message: 'Failed to fetch coach' }); }
});

// ── Send gift to coach (only if subscribed) ────────────────────────────────────
router.post('/gift', authenticateToken, async (req: any, res: Response) => {
  const { coachId, amount, message } = req.body;
  if (!coachId || !amount || amount <= 0) return res.status(400).json({ message: 'Coach ID and valid amount required' });

  try {
    // Check if user has active subscription with this coach
    const sub = await get('SELECT id FROM coach_subscriptions WHERE user_id = ? AND coach_id = ? AND status = ? AND (expires_at IS NULL OR expires_at > NOW())', [req.user.id, coachId, 'active']);
    if (!sub) return res.status(403).json({ message: 'You can only send gifts to coaches you are subscribed to' });

    // Check user has enough points
    const user: any = await get('SELECT points FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.points < amount) return res.status(400).json({ message: 'Insufficient points balance' });

    // Deduct points from user
    await run('UPDATE users SET points = points - ? WHERE id = ?', [amount, req.user.id]);

    // Add credit to coach
    await run('UPDATE users SET credit = credit + ? WHERE id = ?', [amount, coachId]);

    // Log transactions
    await run('INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)',
      [coachId, amount, 'gift', `Gift from user #${req.user.id}: ${message || 'No message'}`]);
    await run('INSERT INTO point_transactions (user_id, points, reason, reference_type) VALUES (?, ?, ?, ?)',
      [req.user.id, -amount, `Gift to coach #${coachId}`, 'gift']);

    // Notify coach
    const sender: any = await get('SELECT name FROM users WHERE id = ?', [req.user.id]);
    await run('INSERT INTO notifications (user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?)',
      [coachId, 'gift_received', '🎁 Gift Received!', `${sender?.name || 'A user'} sent you ${amount} points${message ? ': ' + message : ''}`, '/coach/profile']);

    res.json({ message: 'Gift sent successfully!' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Failed to send gift' }); }
});

export default router;
