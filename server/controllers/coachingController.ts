import { Request, Response } from 'express';
import { run } from '../config/database';

export const bookSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { coachId, date, time, note, bookingType, plan, level } = req.body;
    if (!coachId) return res.status(400).json({ message: 'coachId required' });
    const nowBodyPhoto = (req as any).files?.nowBodyPhoto?.[0] ? `/uploads/${(req as any).files.nowBodyPhoto[0].filename}` : null;
    const dreamBodyPhoto = (req as any).files?.dreamBodyPhoto?.[0] ? `/uploads/${(req as any).files.dreamBodyPhoto[0].filename}` : null;
    const { insertId } = await run(
      "INSERT INTO coaching_bookings (user_id, coach_id, date, time, note, booking_type, plan, level, now_body_photo, dream_body_photo, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
      [userId, coachId, date || '', time || '', note || '', bookingType || 'session', plan || 'complete', level || '1', nowBodyPhoto, dreamBodyPhoto]
    );
    return res.json({ success: true, bookingId: insertId });
  } catch (err) {
    console.error('Booking error', err);
    return res.status(500).json({ message: 'Booking failed' });
  }
};
