import { Request, Response } from 'express';
import { get, run } from '../config/database';

// getDailySteps: reads from steps_entries (the canonical steps table)
export const getDailySteps = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const today = new Date().toISOString().split('T')[0];
    const entry = await get<{ steps: number; calories_burned: number; distance_km: number }>(
      'SELECT steps, calories_burned, distance_km FROM steps_entries WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (entry) {
      return res.json({ steps: entry.steps, calories: entry.calories_burned, distance: entry.distance_km, source: 'steps_entries' });
    }

    return res.json({ steps: 0, message: 'No step data found for today' });
  } catch (error) {
    console.error('Get steps error:', error);
    res.status(500).json({ message: 'Error fetching steps' });
  }
};

// syncSteps: upserts into steps_entries so Dashboard and Steps page share the same data
export const syncSteps = async (req: Request, res: Response) => {
  try {
    const { steps, date, caloriesBurned, distanceKm } = req.body;
    const userId = req.user?.id;

    if (!userId || steps === undefined) {
      return res.status(400).json({ message: 'Steps and valid user required' });
    }

    const summaryDate = date || new Date().toISOString().split('T')[0];
    const existing = await get<{ id: number }>(
      'SELECT id FROM steps_entries WHERE user_id = ? AND date = ?',
      [userId, summaryDate]
    );

    if (existing) {
      await run(
        'UPDATE steps_entries SET steps = ?, calories_burned = ?, distance_km = ? WHERE user_id = ? AND date = ?',
        [steps, caloriesBurned || null, distanceKm || null, userId, summaryDate]
      );
      return res.json({ message: 'Steps updated successfully', date: summaryDate, steps });
    }

    const { insertId } = await run(
      'INSERT INTO steps_entries (user_id, date, steps, calories_burned, distance_km, tracking_mode) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, summaryDate, steps, caloriesBurned || null, distanceKm || null, 'manual']
    );

    res.status(201).json({ message: 'Steps synced successfully', entry_id: insertId, date: summaryDate, steps });
  } catch (error) {
    console.error('Sync steps error:', error);
    res.status(500).json({ message: 'Error syncing steps' });
  }
};
