// Dev seed script - run with: npm run seed
import { run, query } from './config/database';
import bcrypt from 'bcryptjs';
import { initDatabase } from './config/database';

async function seed() {
  await initDatabase();

  // Clear tables (disable FK checks to avoid ordering issues)
  await run('SET FOREIGN_KEY_CHECKS=0');
  await run('DELETE FROM post_comments');
  await run('DELETE FROM challenge_participants');
  await run('DELETE FROM challenges');
  await run('DELETE FROM posts');
  await run('DELETE FROM messages');
  await run('DELETE FROM daily_summaries');
  await run('DELETE FROM steps_entries');
  await run('DELETE FROM premium_sessions');
  await run('DELETE FROM users');
  await run('SET FOREIGN_KEY_CHECKS=1');

  const peterHash = await bcrypt.hash('peterishere', 10);
  const today = new Date().toISOString().split('T')[0];

  // Coach
  const { insertId: coachId } = await run(
    "INSERT INTO users (name, email, password, role, avatar, is_premium, points, steps) VALUES (?, ?, ?, 'coach', ?, 0, 1000, 12000)",
    ['Peter Coach', 'petercoach@example.com', peterHash, 'https://api.dicebear.com/7.x/avataaars/svg?seed=petercoach']
  );

  // Admin
  await run(
    "INSERT INTO users (name, email, password, role, avatar, is_premium, points, steps) VALUES (?, ?, ?, 'admin', ?, 0, 9999, 0)",
    ['Peter Admin', 'peteradmin@example.com', peterHash, 'https://api.dicebear.com/7.x/avataaars/svg?seed=peteradmin']
  );

  // Test user
  const testHash = await bcrypt.hash('password123', 10);
  const { insertId: testUserId } = await run(
    "INSERT INTO users (name, email, password, role, avatar, is_premium, points, steps) VALUES (?, ?, ?, 'user', ?, 1, 500, 8000)",
    ['Test User', 'test@example.com', testHash, 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser']
  );

  // Steps
  await run(
    'INSERT INTO steps_entries (user_id, date, steps, calories_burned, distance_km) VALUES (?, ?, ?, ?, ?)',
    [testUserId, today, 8540, 412, 6.28]
  );

  // Post
  await run(
    'INSERT INTO posts (user_id, content, hashtags, likes) VALUES (?, ?, ?, ?)',
    [testUserId, 'Just finished a great workout! Feeling pumped!', '#fitness #workout', Math.floor(Math.random() * 50)]
  );

  // Challenge
  const { insertId: challengeId } = await run(
    'INSERT INTO challenges (creator_id, title, description, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
    [coachId, '10K Steps Daily', 'Walk 10,000 steps every day for 30 days', today, new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]]
  );
  await run('INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)', [challengeId, testUserId]);

  console.log('✅ Database seeded successfully');
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
