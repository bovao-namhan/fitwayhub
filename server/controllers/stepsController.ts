import { Request, Response } from 'express';
import { query, get, run } from '../config/database';

export const getStepsHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const entries = await query('SELECT id, user_id, date, steps, calories_burned, distance_km, notes, created_at FROM steps_entries WHERE user_id = ? ORDER BY date DESC LIMIT 90', [userId]);
    res.json({ entries, total: entries.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching steps history' });
  }
};

export const getStepsByDate = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { date } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const entry = await get('SELECT id, user_id, date, steps, calories_burned, distance_km, notes, created_at FROM steps_entries WHERE user_id = ? AND date = ?', [userId, date]);
    if (!entry) return res.json({ entry: null, message: 'No data for this date' });
    res.json({ entry });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching steps' });
  }
};

export const addSteps = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { date, steps, caloriesBurned, distanceKm, notes, trackingMode } = req.body;
    if (!userId || !date || steps === undefined) return res.status(400).json({ message: 'Missing required fields: date, steps' });
    if (typeof steps !== 'number' || steps < 0 || steps > 100000) return res.status(400).json({ message: 'Steps must be between 0 and 100000' });

    const existing = await get('SELECT id FROM steps_entries WHERE user_id = ? AND date = ?', [userId, date]);
    if (existing) {
      await run('UPDATE steps_entries SET steps = ?, calories_burned = ?, distance_km = ?, notes = ?, tracking_mode = ? WHERE user_id = ? AND date = ?',
        [steps, caloriesBurned || null, distanceKm || null, notes || null, trackingMode || 'manual', userId, date]);
      return res.json({ message: 'Steps updated successfully', date, steps });
    } else {
      const { insertId } = await run('INSERT INTO steps_entries (user_id, date, steps, calories_burned, distance_km, notes, tracking_mode) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, date, steps, caloriesBurned || null, distanceKm || null, notes || null, trackingMode || 'manual']);
      return res.json({ message: 'Steps added successfully', entry_id: insertId, date, steps });
    }
  } catch (error) {
    console.error('Add steps error:', error);
    res.status(500).json({ message: 'Error adding steps' });
  }
};

export const getWeeklyStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const entries: any[] = await query("SELECT date, steps, calories_burned, distance_km FROM steps_entries WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ORDER BY date ASC", [userId]);
    const totalSteps = entries.reduce((s, e) => s + e.steps, 0);
    const avgSteps = entries.length > 0 ? Math.round(totalSteps / entries.length) : 0;
    const maxSteps = entries.length > 0 ? Math.max(...entries.map(e => e.steps)) : 0;
    const totalCalories = entries.reduce((s, e) => s + (e.calories_burned || 0), 0);
    res.json({ weeklyStats: { totalSteps, avgSteps, maxSteps, totalCalories, daysTracked: entries.length, entries } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching weekly stats' });
  }
};

export const getMonthlyStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const entries: any[] = await query("SELECT date, steps, calories_burned, distance_km FROM steps_entries WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ORDER BY date ASC", [userId]);
    const totalSteps = entries.reduce((s, e) => s + e.steps, 0);
    const avgSteps = entries.length > 0 ? Math.round(totalSteps / entries.length) : 0;
    const maxSteps = entries.length > 0 ? Math.max(...entries.map(e => e.steps)) : 0;
    const totalCalories = entries.reduce((s, e) => s + (e.calories_burned || 0), 0);
    res.json({ monthlyStats: { totalSteps, avgSteps, maxSteps, totalCalories, daysTracked: entries.length, entries } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monthly stats' });
  }
};

export const deleteSteps = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { date } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    await run('DELETE FROM steps_entries WHERE user_id = ? AND date = ?', [userId, date]);
    res.json({ message: 'Steps entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting steps' });
  }
};
