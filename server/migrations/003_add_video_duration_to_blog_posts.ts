import db from '../config/database';
import { run } from '../config/database';

export async function migrate() {
  try {
    // Check if column already exists
    const result = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'blog_posts' AND COLUMN_NAME = 'video_duration'`,
        (err: any, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    if (result.length === 0) {
      // Column doesn't exist, add it
      await run(
        `ALTER TABLE blog_posts 
         ADD COLUMN video_duration INT DEFAULT NULL AFTER video_url`
      );
      console.log('✓ Migration: Added video_duration column to blog_posts table');
    } else {
      console.log('✓ Migration: video_duration column already exists');
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
