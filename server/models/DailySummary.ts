import { run, get, query } from '../config/database';

export interface DailySummary {
  id: number; user_id: number; date: string; steps: number; ai_analysis: string; created_at: string;
}

export const DailySummaryModel = {
  create: async (userId: number, date: string, steps: number, aiAnalysis: string): Promise<DailySummary> => {
    const { insertId } = await run('INSERT INTO daily_summaries (user_id, date, steps, ai_analysis) VALUES (?, ?, ?, ?)', [userId, date, steps, aiAnalysis]);
    return { id: insertId, user_id: userId, date, steps, ai_analysis: aiAnalysis, created_at: new Date().toISOString() };
  },
  findByUserAndDate: async (userId: number, date: string): Promise<DailySummary | undefined> =>
    get<DailySummary>('SELECT * FROM daily_summaries WHERE user_id = ? AND date = ?', [userId, date]),
  findByUser: async (userId: number): Promise<DailySummary[]> =>
    query<DailySummary>('SELECT * FROM daily_summaries WHERE user_id = ? ORDER BY date DESC', [userId]),
};
