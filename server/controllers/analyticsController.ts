import { Request, Response } from 'express';
import { get, query } from '../config/database';

export const getMyAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const totalStepsRow: any = await get('SELECT IFNULL(SUM(steps),0) as totalSteps FROM steps_entries WHERE user_id = ?', [userId]);
    const totalSteps = totalStepsRow?.totalSteps || 0;

    const distRow: any = await get('SELECT IFNULL(SUM(distance_km),0) as dist FROM steps_entries WHERE user_id = ?', [userId]);
    const premiumDistRow: any = await get('SELECT IFNULL(SUM(total_distance_km),0) as dist FROM premium_sessions WHERE user_id = ?', [userId]);
    const totalDistance = Number((distRow?.dist || 0)) + Number((premiumDistRow?.dist || 0));

    const calRow: any = await get('SELECT IFNULL(SUM(calories_burned),0) as cal FROM steps_entries WHERE user_id = ?', [userId]);
    const premiumCalRow: any = await get('SELECT IFNULL(SUM(calories),0) as cal FROM premium_sessions WHERE user_id = ?', [userId]);
    const totalCalories = Number((calRow?.cal || 0)) + Number((premiumCalRow?.cal || 0));

    const sessionsCountRow: any = await get('SELECT COUNT(*) as cnt FROM premium_sessions WHERE user_id = ?', [userId]);
    const sessionsCount = sessionsCountRow?.cnt || 0;
    const recentSessions = await query('SELECT id, start_time, end_time, total_steps, total_distance_km, calories, path_json, created_at FROM premium_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', [userId]);

    const weeklyRows = await query("SELECT date, steps, IFNULL(calories_burned,0) as calories FROM steps_entries WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) ORDER BY date ASC", [userId]);

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const weeklyMap: Record<string, any> = {};
    weeklyRows.forEach((r: any) => { weeklyMap[r.date] = r; });
    const weekly = Array.from({length: 7}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = days[d.getDay()];
      return weeklyMap[dateStr] ? { day: dayLabel, steps: weeklyMap[dateStr].steps, calories: weeklyMap[dateStr].calories } : { day: dayLabel, steps: 0, calories: 0 };
    });

    res.json({ totalSteps, totalDistance, totalCalories, sessionsCount, recentSessions, weekly });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
