import { Request, Response } from 'express';
import { get, run } from '../config/database';

/** Convert ISO 8601 string to MySQL DATETIME format */
function toMySQLDatetime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch { return null; }
}

export const saveSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { startTime, endTime, totalSteps, totalDistanceKm, totalDistanceMeters, calories, path } = req.body;

    // Accept distance in either km or meters
    let distKm: number = 0;
    if (totalDistanceKm != null && typeof totalDistanceKm === 'number' && totalDistanceKm >= 0) {
      distKm = totalDistanceKm;
    } else if (totalDistanceMeters != null && typeof totalDistanceMeters === 'number' && totalDistanceMeters >= 0) {
      distKm = totalDistanceMeters / 1000;
    }

    const safeSteps = (typeof totalSteps === 'number' && totalSteps >= 0) ? Math.round(totalSteps) : 0;
    const safeCals = (typeof calories === 'number' && calories >= 0) ? Math.round(calories) : 0;
    const safePath = Array.isArray(path) ? path : [];

    // Save to premium_sessions (detailed GPS track)
    const { insertId } = await run(
      'INSERT INTO premium_sessions (user_id, start_time, end_time, total_steps, total_distance_km, calories, path_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, toMySQLDatetime(startTime), toMySQLDatetime(endTime), safeSteps, +distKm.toFixed(3), safeCals, JSON.stringify(safePath)]
    );

    // Also upsert today's steps_entries so the data appears in step history/stats
    const today = new Date().toISOString().split('T')[0];
    const existing: any = await get('SELECT id, steps, calories_burned, distance_km FROM steps_entries WHERE user_id = ? AND date = ?', [userId, today]);
    if (existing) {
      // Merge: use the higher value (manual entry or live session)
      const mergedSteps = Math.max(existing.steps || 0, safeSteps);
      const mergedCals = Math.max(existing.calories_burned || 0, safeCals);
      const mergedDist = Math.max(existing.distance_km || 0, distKm);
      await run(
        'UPDATE steps_entries SET steps = ?, calories_burned = ?, distance_km = ?, tracking_mode = ? WHERE id = ?',
        [mergedSteps, mergedCals, +mergedDist.toFixed(3), 'live', existing.id]
      );
    } else {
      await run(
        'INSERT INTO steps_entries (user_id, date, steps, calories_burned, distance_km, tracking_mode) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, today, safeSteps, safeCals, +distKm.toFixed(3), 'live']
      );
    }

    return res.json({ ok: true, sessionId: insertId });
  } catch (err) {
    console.error('saveSession error', err);
    return res.status(500).json({ message: 'Failed to save session' });
  }
};
