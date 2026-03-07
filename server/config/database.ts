import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DB_PASS || 'Peterishere1';
const DB_NAME = process.env.DB_NAME || 'Mangolian';
const DB_AUTO_CREATE = process.env.DB_AUTO_CREATE !== 'false';

function escapeDbIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}

// ── Connection pool ───────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

// ── Helpers ───────────────────────────────────────────────────────────────────
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.execute(sql, params ?? []);
  return rows as T[];
}

export async function run(sql: string, params?: any[]): Promise<{ insertId: number; affectedRows: number }> {
  const [result] = await pool.execute(sql, params ?? []) as any;
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

export async function get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

// ── Initialize tables ─────────────────────────────────────────────────────────
async function initTables() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      avatar TEXT,
      is_premium TINYINT(1) DEFAULT 0,
      points INT DEFAULT 0,
      steps INT DEFAULT 0,
      height INT,
      weight INT,
      gender VARCHAR(20),
      reset_token TEXT,
      reset_token_expires BIGINT,
      remember_token TEXT,
      offline_steps INT DEFAULT 0,
      last_sync DATETIME,
      coach_membership_active TINYINT(1) DEFAULT 0,
      step_goal INT DEFAULT 10000,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS daily_summaries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      date VARCHAR(20) NOT NULL,
      steps INT NOT NULL,
      ai_analysis TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS steps_entries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      date VARCHAR(20) NOT NULL,
      steps INT NOT NULL,
      calories_burned INT,
      distance_km FLOAT,
      notes TEXT,
      tracking_mode VARCHAR(50) DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY unique_user_date (user_id, date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT,
      group_id INT,
      challenge_id INT,
      content TEXT,
      media_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      content TEXT,
      media_url TEXT,
      hashtags TEXT,
      likes INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS challenges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      creator_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_date VARCHAR(20),
      end_date VARCHAR(20),
      image_url TEXT,
      participant_count INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS challenge_participants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      challenge_id INT NOT NULL,
      user_id INT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (challenge_id) REFERENCES challenges(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY unique_challenge_user (challenge_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS premium_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      start_time DATETIME,
      end_time DATETIME,
      total_steps INT,
      total_distance_km FLOAT,
      calories INT,
      path_json LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS post_likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE KEY unique_post_user (post_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS post_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS user_follows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      follower_id INT NOT NULL,
      following_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users(id),
      FOREIGN KEY (following_id) REFERENCES users(id),
      UNIQUE KEY unique_follow (follower_id, following_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS chat_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id),
      UNIQUE KEY unique_chat_req (sender_id, receiver_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS workout_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      coach_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      days_per_week INT DEFAULT 3,
      exercises JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS nutrition_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      coach_id INT,
      title VARCHAR(255) NOT NULL,
      daily_calories INT DEFAULT 2000,
      protein_g INT DEFAULT 150,
      carbs_g INT DEFAULT 250,
      fat_g INT DEFAULT 65,
      meals JSON,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS workout_videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      duration VARCHAR(20),
      category VARCHAR(100) DEFAULT 'General',
      is_premium TINYINT(1) DEFAULT 0,
      thumbnail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS gifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      admin_id INT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) DEFAULT 'points',
      value INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      plan VARCHAR(50) NOT NULL,
      amount FLOAT NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'card',
      card_last4 VARCHAR(10),
      card_name VARCHAR(255),
      transaction_id VARCHAR(255),
      proof_url VARCHAR(500),
      wallet_type VARCHAR(50),
      sender_number VARCHAR(30),
      status VARCHAR(20) DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS coach_ads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      coach_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      specialty VARCHAR(100),
      cta VARCHAR(255) DEFAULT 'Book Free Consultation',
      highlight VARCHAR(255),
      image_url VARCHAR(500),
      payment_method VARCHAR(50) DEFAULT 'free',
      status VARCHAR(20) DEFAULT 'pending',
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS coach_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      coach_id INT NOT NULL,
      user_id INT NOT NULL,
      rating INT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS coach_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNIQUE NOT NULL,
      bio TEXT,
      specialty VARCHAR(255) DEFAULT '',
      location VARCHAR(255) DEFAULT '',
      price FLOAT DEFAULT 50,
      available TINYINT(1) DEFAULT 1,
      sessions_count INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS coaching_bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      coach_id INT NOT NULL,
      date VARCHAR(20),
      time VARCHAR(20),
      note TEXT,
      booking_type VARCHAR(50) DEFAULT 'session',
      plan VARCHAR(50) DEFAULT 'complete',
      level VARCHAR(20) DEFAULT '1',
      now_body_photo VARCHAR(500),
      dream_body_photo VARCHAR(500),
      status VARCHAR(20) DEFAULT 'pending',
      amount FLOAT DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (coach_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      link VARCHAR(255),
      is_read TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS website_sections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      page VARCHAR(50) NOT NULL DEFAULT 'home',
      type VARCHAR(50) NOT NULL,
      label VARCHAR(255) NOT NULL,
      content LONGTEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_visible TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS payment_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const stmt of stmts) {
    await pool.execute(stmt);
  }
  console.log('✅ All MySQL tables ready');
}

// ── Seed default accounts ─────────────────────────────────────────────────────
async function seedDefaultAccounts() {
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const accounts = [
      { email: 'petercoach@example.com', name: 'Peter Coach', role: 'coach', points: 1000, steps: 12000, pw: 'peterishere' },
      { email: 'peteradmin@example.com', name: 'Peter Admin', role: 'admin', points: 9999, steps: 0,     pw: 'peterishere' },
      { email: 'test@example.com',       name: 'Test User',   role: 'user',  points: 500,  steps: 8000,  pw: 'password123' },
    ];
    for (const acc of accounts) {
      const existing = await get('SELECT id FROM users WHERE email = ?', [acc.email]);
      if (!existing) {
        const hash = await bcrypt.hash(acc.pw, 10);
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${acc.email.split('@')[0]}`;
        await run(
          'INSERT INTO users (email, password, name, role, avatar, is_premium, membership_paid, points, steps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            acc.email,
            hash,
            acc.name,
            acc.role,
            avatar,
            acc.role === 'user' ? 1 : 0,
            acc.role === 'coach' || acc.role === 'admin' ? 1 : 0,
            acc.points,
            acc.steps,
          ]
        );
        console.log(`✅ Auto-created ${acc.role}: ${acc.email} / ${acc.pw}`);
      }
    }
  // Seed default website sections
  const existingSections = await get('SELECT id FROM website_sections LIMIT 1');
  if (!existingSections) {
    const defaultSections = [
      // HOME PAGE
      { page: 'home', type: 'hero', label: 'Hero Section', sort_order: 1, content: JSON.stringify({ badge: '#1 DIGITAL FITNESS ECOSYSTEM IN EGYPT', heading: 'Transform Your Body.', headingAccent: 'Empower Your Mind.', subheading: 'Join Fitway Hub for accessible, certified, and human-driven fitness programs. Whether you\'re a beginner or a pro, we have a plan for you.', primaryBtnText: 'Start Free Today', primaryBtnLink: '/auth/register', secondaryBtnText: 'Learn More', secondaryBtnLink: '/about', backgroundImage: '' }) },
      { page: 'home', type: 'stats', label: 'Stats Bar', sort_order: 2, content: JSON.stringify({ items: [{ value: '12K+', label: 'Active Members' }, { value: '50+', label: 'Programs' }, { value: '4.9★', label: 'App Rating' }, { value: '98%', label: 'Satisfaction' }] }) },
      { page: 'home', type: 'features', label: 'Features Grid', sort_order: 3, content: JSON.stringify({ sectionLabel: 'Why Fitway', heading: 'Everything you need to win', items: [{ icon: 'Dumbbell', title: '50+ Workout Programs', desc: 'From beginner bodyweight to advanced powerlifting — certified and structured.' }, { icon: 'Brain', title: 'AI-Powered Coaching', desc: 'Personalized step analysis, recovery insights, and adaptive goal-setting.' }, { icon: 'BarChart', title: 'Smart Analytics', desc: 'Track steps, calories, and activity trends with beautiful visual dashboards.' }, { icon: 'Users', title: 'Community & Challenges', desc: 'Join thousands of members, compete in challenges, and stay accountable.' }] }) },
      { page: 'home', type: 'text_image', label: 'Digital Fitness Explainer', sort_order: 4, content: JSON.stringify({ sectionLabel: 'What is Digital Fitness?', heading: 'The gym in your pocket.', text: 'Digital fitness bridges physical wellness and technology. We bring certified training plans, nutrition guides, and community support right to your device — anytime, anywhere.', bullets: ['Access workouts anytime, anywhere', 'Track your progress with smart tools', 'Connect with a supportive community', 'Get expert advice from certified trainers'], imageSide: 'right', imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop', linkText: 'Our mission', linkUrl: '/about' }) },
      { page: 'home', type: 'cta', label: 'Bottom CTA', sort_order: 5, content: JSON.stringify({ badge: 'JOIN 12,000+ MEMBERS', heading: 'Your best shape starts today.', subheading: 'Free to join. No credit card required.', btnText: 'Create Free Account', btnLink: '/auth/register' }) },
      // ABOUT PAGE
      { page: 'about', type: 'hero', label: 'About Hero', sort_order: 1, content: JSON.stringify({ badge: 'Our Story', heading: 'About Fitway Hub', subheading: "Egypt's leading digital fitness ecosystem — bridging physical wellness, digital support, and community empowerment.", backgroundImage: '' }) },
      { page: 'about', type: 'cards', label: 'Mission & Vision', sort_order: 2, content: JSON.stringify({ heading: '', items: [{ icon: 'Target', title: 'Our Mission', desc: 'To empower individuals in Egypt with accessible, certified, and human-driven digital fitness services that foster healthy lifestyles and strong communities.', color: 'accent' }, { icon: 'Eye', title: 'Our Vision', desc: "To become Egypt & GCC's leading digital fitness ecosystem — bridging the gap between physical wellness, digital support, and community empowerment.", color: 'blue' }] }) },
      { page: 'about', type: 'features', label: 'Core Values', sort_order: 3, content: JSON.stringify({ sectionLabel: 'What We Stand For', heading: 'Core Values', items: [{ icon: 'Shield', title: 'Authenticity', desc: 'Real trainers, real support — no AI-generated training.' }, { icon: 'Globe', title: 'Accessibility', desc: 'Bilingual support and offline programs for all connectivity levels.' }, { icon: 'Users', title: 'Community', desc: 'Group challenges, chat groups, and accountability forums.' }, { icon: 'BookOpen', title: 'Knowledge', desc: 'Courses on fitness, nutrition, and holistic wellness.' }, { icon: 'Heart', title: 'Accountability', desc: 'Follow-ups, milestones, and regular assessment features.' }] }) },
      { page: 'about', type: 'cta', label: 'About CTA', sort_order: 4, content: JSON.stringify({ heading: 'Start Your Journey Today', subheading: 'Join thousands transforming their lives with Fitway Hub.', btnText: 'Sign Up Free', btnLink: '/auth/register' }) },
      // CONTACT PAGE
      { page: 'contact', type: 'hero', label: 'Contact Hero', sort_order: 1, content: JSON.stringify({ badge: 'Support', heading: 'Get in Touch', subheading: "Have questions? We're here to help — reach out or check our FAQs.", backgroundImage: '' }) },
      { page: 'contact', type: 'contact_info', label: 'Contact Details', sort_order: 2, content: JSON.stringify({ phone: '+20 123 456 7890', email: 'support@fitwayhub.com', chatHours: '9am – 5pm EST', faqs: [{ q: 'Is the app available in Arabic?', a: 'Yes! Fitway Hub is entirely bilingual, offering full support in both Arabic and English.' }, { q: 'Do I need gym equipment?', a: 'Not necessarily. We offer programs for gym, home (with equipment), and home (bodyweight only).' }, { q: 'Are the trainers certified?', a: 'Absolutely. All our trainers are certified professionals — no AI bots.' }, { q: 'Can I cancel my subscription?', a: 'Yes, you can cancel at any time from your account settings with no hassle.' }] }) },
    ];
    for (const s of defaultSections) {
      await run('INSERT INTO website_sections (page, type, label, content, sort_order) VALUES (?,?,?,?,?)', [s.page, s.type, s.label, s.content, s.sort_order]);
    }
    console.log('✅ Default website sections seeded');
  }
  } catch (err) {
    console.error('Seed error:', err);
  }
}

// ── Bootstrap: create DB if missing, init tables, seed ───────────────────────
export async function initDatabase() {
  // Try to connect with retries — helpful when MySQL is slow to start
  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rootPool = mysql.createPool({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        waitForConnections: true,
        connectionLimit: 2,
      });
      if (DB_AUTO_CREATE) {
        await rootPool.execute(`CREATE DATABASE IF NOT EXISTS ${escapeDbIdentifier(DB_NAME)} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`);
      }
      await rootPool.end();
      break; // success
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        if (attempt === MAX_RETRIES) {
          console.error(`\n❌ Could not connect to MySQL after ${MAX_RETRIES} attempts.`);
          console.error('   Make sure MySQL is running:');
          console.error('   • Windows: Start "MySQL80" in Services (services.msc) or run: net start MySQL80');
          console.error('   • Or install MySQL: https://dev.mysql.com/downloads/installer/');
          console.error(`   • Host: ${DB_HOST} Port: ${DB_PORT} User: ${DB_USER}\n`);
          process.exit(1);
        }
        console.warn(`⚠️  MySQL not ready (attempt ${attempt}/${MAX_RETRIES}), retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
      } else if ((err.code === 'ER_DBACCESS_DENIED_ERROR' || err.code === 'ER_ACCESS_DENIED_ERROR') && !DB_AUTO_CREATE) {
        break;
      } else {
        throw err;
      }
    }
  }
  await initTables();
  // Add new columns to existing tables if they don't exist yet
  try { await pool.execute("ALTER TABLE users ADD COLUMN step_goal INT DEFAULT 10000"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN coach_membership_active TINYINT(1) DEFAULT 0"); } catch {}
  // New tables for points, ad payments, video duration
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS point_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      points INT NOT NULL,
      reason VARCHAR(255),
      reference_type VARCHAR(50),
      reference_id VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS ad_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ad_id INT NOT NULL,
      coach_id INT NOT NULL,
      duration_minutes INT NOT NULL DEFAULT 0,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'ewallet',
      proof_url VARCHAR(500),
      phone VARCHAR(30),
      card_last4 VARCHAR(10),
      status VARCHAR(20) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (ad_id) REFERENCES coach_ads(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}
  // Add new columns to coach_ads and workout_videos
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN admin_note TEXT"); } catch {}
  try { await pool.execute("ALTER TABLE workout_videos ADD COLUMN duration_seconds INT DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE workout_videos ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"); } catch {}
  // New ad columns: type, placement, media type, objective, duration_hours, duration_days, media_url, video_url
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN ad_type VARCHAR(20) DEFAULT 'community'"); } catch {}  // community | home_banner
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN media_type VARCHAR(10) DEFAULT 'image'"); } catch {}  // image | video
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN video_url VARCHAR(500)"); } catch {}
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN objective VARCHAR(20) DEFAULT 'coaching'"); } catch {}  // coaching | awareness
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN duration_hours INT DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN duration_days INT DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN boost_start DATETIME"); } catch {}
  try { await pool.execute("ALTER TABLE coach_ads ADD COLUMN boost_end DATETIME"); } catch {}
  // Coach follows (user follows a coach as favourite)
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS coach_follows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      follower_id INT NOT NULL,
      coach_id INT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_follow (follower_id, coach_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}
  // New feature columns
  try { await pool.execute("ALTER TABLE users ADD COLUMN medical_history TEXT"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN medical_file_url VARCHAR(500)"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 1"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN membership_paid TINYINT(1) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE posts ADD COLUMN is_hidden TINYINT(1) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE posts ADD COLUMN moderated_by INT"); } catch {}
  try { await pool.execute("ALTER TABLE posts ADD COLUMN moderation_reason VARCHAR(255)"); } catch {}
  try { await pool.execute("ALTER TABLE posts ADD COLUMN is_announcement TINYINT(1) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE posts ADD COLUMN is_pinned TINYINT(1) DEFAULT 0"); } catch {}
  // App settings table for dynamic config / branding
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS app_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type VARCHAR(20) DEFAULT 'text',
      category VARCHAR(50) DEFAULT 'general',
      label VARCHAR(100),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}
  // Seed default app settings
  try {
    const defaultSettings = [
      ['app_name', 'FitWay Hub', 'text', 'branding', 'App Name'],
      ['app_tagline', 'Your fitness journey starts here', 'text', 'branding', 'Tagline'],
      ['logo_url', '', 'image', 'branding', 'Logo Image'],
      ['favicon_url', '', 'image', 'branding', 'Favicon'],
      ['footer_text', "Egypt's #1 digital fitness ecosystem. Certified training, smart tools, and a community that pushes you forward.", 'text', 'branding', 'Footer Description'],
      ['copyright_text', '© 2025 FitWay Hub. All rights reserved.', 'text', 'branding', 'Copyright Text'],
      ['social_instagram', '', 'text', 'branding', 'Instagram URL'],
      ['social_facebook', '', 'text', 'branding', 'Facebook URL'],
      ['social_twitter', '', 'text', 'branding', 'Twitter / X URL'],
      ['social_youtube', '', 'text', 'branding', 'YouTube URL'],
      ['primary_color', '#C8FF00', 'color', 'branding', 'Primary Color (Accent)'],
      ['secondary_color', '#3B8BFF', 'color', 'branding', 'Secondary Color (Blue)'],
      ['bg_primary', '#0A0A0B', 'color', 'branding', 'Background Primary'],
      ['bg_card', '#111113', 'color', 'branding', 'Card Background'],
      ['font_en', 'Outfit', 'font', 'branding', 'English Font'],
      ['font_ar', 'Cairo', 'font', 'branding', 'Arabic Font'],
      ['font_heading', 'Chakra Petch', 'font', 'branding', 'Heading Font'],
      ['free_user_max_videos', '3', 'number', 'access', 'Free Videos Limit'],
      ['free_user_can_access_coaching', '1', 'boolean', 'access', 'Free Users Can Browse Coaches'],
      ['coach_membership_fee_usd', '29.99', 'number', 'pricing', 'Coach Monthly Fee (USD)'],
      ['user_premium_fee_usd', '9.99', 'number', 'pricing', 'User Premium Monthly (USD)'],
      ['registration_points_gift', '200', 'number', 'points', 'Registration Bonus Points'],
      ['video_watch_points', '2', 'number', 'points', 'Points per Video Watch'],
      ['goal_complete_points', '2', 'number', 'points', 'Points per Goal Completed'],
    ];
    for (const [key, value, type, category, label] of defaultSettings) {
      await pool.execute(
        'INSERT IGNORE INTO app_settings (setting_key, setting_value, setting_type, category, label) VALUES (?,?,?,?,?)',
        [key, value, type, category, label]
      );
    }
  } catch {}

  // ── Coach credit & subscription system ─────────────────────────────────
  try { await pool.execute("ALTER TABLE users ADD COLUMN credit DECIMAL(10,2) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN payment_phone VARCHAR(30)"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN payment_wallet_type VARCHAR(30)"); } catch {}
  // Expanded payment methods: PayPal, credit card, Etisalat, InstaPay
  try { await pool.execute("ALTER TABLE users ADD COLUMN payment_method_type VARCHAR(30) DEFAULT 'ewallet'"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN paypal_email VARCHAR(255)"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN card_holder_name VARCHAR(100)"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN card_number VARCHAR(30)"); } catch {}
  try { await pool.execute("ALTER TABLE users ADD COLUMN instapay_handle VARCHAR(100)"); } catch {}

  // Coach subscriptions: user subscribes to a coach (monthly/yearly)
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS coach_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      coach_id INT NOT NULL,
      plan_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
      plan_type VARCHAR(20) NOT NULL DEFAULT 'complete',
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      payment_method VARCHAR(50),
      payment_proof VARCHAR(500),
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN admin_approval_status VARCHAR(20) DEFAULT 'pending'"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN coach_decision_status VARCHAR(20) DEFAULT 'pending'"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN refund_status VARCHAR(20) DEFAULT 'none'"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN refunded_at DATETIME"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN refund_reason VARCHAR(255)"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN admin_approved_at DATETIME"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN coach_decided_at DATETIME"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN credited_amount DECIMAL(10,2) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN credit_released_at DATETIME"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN payer_wallet_type VARCHAR(30)"); } catch {}
  try { await pool.execute("ALTER TABLE coach_subscriptions ADD COLUMN payer_number VARCHAR(30)"); } catch {}
  try { await pool.execute("UPDATE coach_subscriptions SET status = 'pending_admin' WHERE status = 'pending'"); } catch {}

  // Coach plan types offered (what the coach offers)
  try { await pool.execute("ALTER TABLE coach_profiles ADD COLUMN plan_types VARCHAR(100) DEFAULT 'complete'"); } catch {}
  // plan_types can be: 'complete' (both), 'workout', 'nutrition', or comma-separated

  // Coach monthly/yearly prices
  try { await pool.execute("ALTER TABLE coach_profiles ADD COLUMN monthly_price DECIMAL(10,2) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE coach_profiles ADD COLUMN yearly_price DECIMAL(10,2) DEFAULT 0"); } catch {}

  // Withdrawal requests
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      coach_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      payment_phone VARCHAR(30),
      wallet_type VARCHAR(30),
      status VARCHAR(20) DEFAULT 'pending',
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}
  // Expanded withdrawal payment details
  try { await pool.execute("ALTER TABLE withdrawal_requests ADD COLUMN payment_method_type VARCHAR(30) DEFAULT 'ewallet'"); } catch {}
  try { await pool.execute("ALTER TABLE withdrawal_requests ADD COLUMN paypal_email VARCHAR(255)"); } catch {}
  try { await pool.execute("ALTER TABLE withdrawal_requests ADD COLUMN card_holder_name VARCHAR(100)"); } catch {}
  try { await pool.execute("ALTER TABLE withdrawal_requests ADD COLUMN card_number VARCHAR(30)"); } catch {}
  try { await pool.execute("ALTER TABLE withdrawal_requests ADD COLUMN instapay_handle VARCHAR(100)"); } catch {}

  // Credit transactions log
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS credit_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      type VARCHAR(30) NOT NULL,
      reference_id INT,
      description VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  // ── Coaching meetings & files ─────────────────────────────────
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS coaching_meetings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      coach_id INT NOT NULL,
      user_id INT NOT NULL,
      title VARCHAR(255) DEFAULT 'Coaching Session',
      room_id VARCHAR(100) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'scheduled',
      scheduled_at DATETIME,
      started_at DATETIME,
      ended_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS meeting_files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      meeting_id INT NOT NULL,
      uploaded_by INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_type VARCHAR(100),
      file_size INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES coaching_meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS meeting_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      meeting_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (meeting_id) REFERENCES coaching_meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  // Migrate old theme/fonts categories into branding
  try { await pool.execute("UPDATE app_settings SET category = 'branding' WHERE category IN ('theme', 'fonts')"); } catch {}

  await seedDefaultAccounts();
}

export default pool;
