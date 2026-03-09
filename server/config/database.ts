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
      security_question VARCHAR(255),
      security_answer VARCHAR(255),
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

    `CREATE TABLE IF NOT EXISTS blog_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(160) NOT NULL,
      language VARCHAR(5) NOT NULL DEFAULT 'en',
      related_blog_id INT,
      excerpt TEXT,
      content LONGTEXT NOT NULL,
      header_image_url VARCHAR(500),
      video_url VARCHAR(500),
      video_duration INT,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      author_id INT NOT NULL,
      author_role VARCHAR(50) NOT NULL,
      published_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (related_blog_id) REFERENCES blog_posts(id) ON DELETE SET NULL,
      UNIQUE KEY unique_slug_lang (slug, language),
      INDEX idx_blog_posts_status (status),
      INDEX idx_blog_posts_author_id (author_id),
      INDEX idx_blog_posts_published_at (published_at),
      INDEX idx_blog_posts_language (language),
      INDEX idx_blog_posts_related (related_blog_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS payment_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      setting_key VARCHAR(100) NOT NULL UNIQUE,
      setting_value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS user_workout_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      workout_type VARCHAR(100) NOT NULL,
      video_url TEXT,
      time_minutes INT DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS user_nutrition_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      meal_time VARCHAR(50) NOT NULL,
      meal_type VARCHAR(100),
      meal_name VARCHAR(255) NOT NULL,
      contents TEXT,
      calories INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  for (const stmt of stmts) {
    await pool.execute(stmt);
  }

  // Add security question columns if missing (migration for existing DBs)
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN security_question VARCHAR(255) AFTER remember_token');
    await pool.execute('ALTER TABLE users ADD COLUMN security_answer VARCHAR(255) AFTER security_question');
  } catch (e: any) {
    // columns already exist — ignore
    if (!e.message?.includes('Duplicate column')) throw e;
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

  // ── Seed additional homepage sections (team, carousel, blogs, faq, contact) ──
  const hasTeam = await get("SELECT id FROM website_sections WHERE page='home' AND type='team' LIMIT 1");
  if (!hasTeam) {
    // Push CTA to sort_order 99 so new sections appear before it
    await run("UPDATE website_sections SET sort_order = 99 WHERE page='home' AND type='cta'");
    const newHomeSections = [
      { page: 'home', type: 'team', label: 'Who We Are', sort_order: 5, content: JSON.stringify({
        sectionLabel: 'WHO WE ARE',
        heading: 'Meet the Team Behind FitWay',
        subheading: 'Passionate professionals committed to transforming the fitness industry in Egypt and beyond.',
        members: [
          { name: 'Peter Adel', role: 'Founder & CEO', bio: 'Visionary entrepreneur building Egypt\'s #1 digital fitness ecosystem.', imageUrl: '' },
          { name: 'Sara Mostafa', role: 'Head of Training', bio: 'Certified personal trainer with 8+ years of experience in group and individual coaching.', imageUrl: '' },
          { name: 'Ahmed Hassan', role: 'Lead Developer', bio: 'Full-stack engineer passionate about building tech that empowers healthier lives.', imageUrl: '' },
          { name: 'Nour El-Din', role: 'Nutrition Specialist', bio: 'Sports nutritionist helping members fuel their workouts and reach peak performance.', imageUrl: '' },
        ]
      })},
      { page: 'home', type: 'carousel', label: 'Solutions Carousel', sort_order: 6, content: JSON.stringify({
        sectionLabel: 'WHAT WE OFFER',
        heading: 'Comprehensive Solutions for Your Fitness Business',
        items: [
          { title: 'Personal Training Plans', desc: 'Customized workout programs designed by certified trainers — for gym, home, and bodyweight training.', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop' },
          { title: 'AI-Powered Analytics', desc: 'Smart dashboards that track steps, calories, and performance trends with actionable insights.', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop' },
          { title: 'Expert Coaching Network', desc: 'Connect with certified coaches for 1-on-1 sessions, group classes, and ongoing mentorship.', imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop' },
          { title: 'Community & Challenges', desc: 'Join thriving fitness communities, compete in challenges, and stay accountable with peers.', imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop' },
          { title: 'Nutrition & Meal Planning', desc: 'Balanced meal plans and macro tracking tools to complement your training and maximize results.', imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2070&auto=format&fit=crop' },
        ]
      })},
      { page: 'home', type: 'latest_blogs', label: 'No Pain No Shawerma', sort_order: 7, content: JSON.stringify({
        sectionLabel: 'DUDE, No Pain No Shawerma!!',
        heading: 'Your Go-To Resource for Fitness Trends and Tips',
      })},
      { page: 'home', type: 'faq', label: 'FAQ Section', sort_order: 8, content: JSON.stringify({
        sectionLabel: 'FREQUENTLY ASKED QUESTIONS',
        heading: "Everything you need to know about using FitWay's platform and services",
        faqs: [
          { q: 'What is Fitway Hub?', a: 'Fitway Hub is Egypt\'s leading digital fitness platform offering personalized training plans, AI analytics, expert coaching, and a supportive community — all in one app.' },
          { q: 'Is the app free to use?', a: 'Yes! You can sign up for free and access basic features. Premium plans unlock advanced coaching, analytics, and exclusive workout programs.' },
          { q: 'Is the app available in Arabic?', a: 'Absolutely! Fitway Hub is fully bilingual — you can switch between Arabic and English at any time.' },
          { q: 'Do I need gym equipment?', a: 'Not necessarily. We offer programs for gym, home (with equipment), and home (bodyweight only) — choose what fits your lifestyle.' },
          { q: 'Are the trainers certified?', a: 'Yes, all our coaches and trainers are certified professionals with verified credentials. No AI bots, only real human support.' },
          { q: 'Can I cancel my subscription anytime?', a: 'Yes, you can cancel your subscription at any time from your account settings — no hidden fees or hassle.' },
          { q: 'How does the coaching feature work?', a: 'Browse certified coaches, book sessions, chat directly, and receive personalized guidance. Coaches set their own availability and pricing.' },
          { q: 'What kind of analytics does the app provide?', a: 'Track daily steps, calories burned, workout frequency, streaks, and long-term progress trends with beautiful visual dashboards.' },
        ]
      })},
      { page: 'home', type: 'contact_info', label: 'Get In Touch', sort_order: 9, content: JSON.stringify({
        formTitle: 'GET IN TOUCH WITH FITWAY HUB',
        phone: '+20 123 456 7890',
        email: 'support@fitwayhub.com',
        chatHours: '9am – 5pm EST',
        faqs: [],
        nameLabel: 'Name', emailLabel: 'Email', subjectLabel: 'Subject',
        messageLabel: 'Message', sendBtnText: 'Send Message',
        quickContactTitle: 'Quick Contact',
        subjectOptions: ['General Inquiry', 'Support', 'Partnership', 'Feedback'],
      })},
    ];
    for (const s of newHomeSections) {
      await run('INSERT INTO website_sections (page, type, label, content, sort_order) VALUES (?,?,?,?,?)', [s.page, s.type, s.label, s.content, s.sort_order]);
    }
    console.log('✅ Additional homepage sections seeded (team, carousel, blogs, faq, contact)');
  }

  } catch (err) {
    console.error('Seed error:', err);
  }
}

// ── Seed push notification templates ──────────────────────────────────────────
async function seedPushTemplates() {
  const templates = [
    { slug: 'user_welcome', title: 'Welcome to Fitway Hub 🎉', body: 'Hi {{first_name}} — your starter plan is ready. Tap to set goals and claim your free Day 1 workout.', category: 'new_user', trigger_type: 'registration_immediate' },
    { slug: 'user_profile_complete', title: 'Complete your profile', body: 'Complete your profile in 2 minutes to unlock a personalized plan and faster results. Tap to finish.', category: 'new_user', trigger_type: 'profile_incomplete_24h' },
    { slug: 'user_first_workout', title: 'Ready for Workout #1? 💪', body: 'Your first workout is queued. Open the app, follow the 15-min routine, and earn your starter badge.', category: 'new_user', trigger_type: 'after_profile_completion' },
    { slug: 'user_motivation', title: "Let's Move! 🔥", body: 'Just 10 minutes today can make a difference. Open Fitway Hub and start your session.', category: 'new_user', trigger_type: 'midday_nudge' },
    { slug: 'user_coach_suggestion', title: 'Need a Coach?', body: 'Connect with expert coaches on Fitway Hub and get guidance for faster results.', category: 'new_user', trigger_type: 'day_3' },
    { slug: 'user_welcome_gift', title: 'Claim your welcome gift 🎁', body: 'New here? Tap to claim a free 7-day premium trial and access pro workouts and coach tips.', category: 'new_user', trigger_type: 'within_48h' },
    { slug: 'coach_welcome', title: 'Welcome Coach! 🎉', body: 'Your coaching journey starts now. Complete your profile to start receiving clients.', category: 'new_coach', trigger_type: 'registration_immediate' },
    { slug: 'coach_verify', title: 'Verify Your Credentials', body: 'Upload your certifications to get verified and increase your visibility to users.', category: 'new_coach', trigger_type: 'day_1' },
    { slug: 'coach_profile_complete', title: 'Finish Your Coach Profile', body: 'Add your specialties, bio, and pricing to start attracting your first clients.', category: 'new_coach', trigger_type: 'profile_incomplete_24h' },
    { slug: 'coach_first_client', title: 'Your First Client Awaits', body: 'Publish your profile and start receiving coaching requests today.', category: 'new_coach', trigger_type: 'day_2' },
    { slug: 'coach_engagement', title: 'Stay Active on Fitway Hub', body: 'Respond to client requests quickly to grow your coaching reputation.', category: 'new_coach', trigger_type: 'weekly' },
    { slug: 'quick_session', title: '10 minutes = big progress', body: 'Short on time? Try a 10-minute quick session now and keep your streak alive. Tap to start.', category: 'engagement', trigger_type: 'midday_nudge' },
    { slug: 'streak_milestone', title: "You're on a roll 🔥", body: "{{first_name}}, {{streak_days}}-day streak! Keep it going — complete today's session and unlock bonus points.", category: 'streak', trigger_type: 'streak_milestone' },
    { slug: 'missed_day', title: 'Missed a day? Bounce back!', body: "Missed your last workout — start a gentle 8-min session to get back on track. We've got you.", category: 'inactivity', trigger_type: 'inactive_1_day' },
    { slug: 'starter_plan', title: 'New 7-day starter plan', body: 'We built a 7-day plan just for you. Tap to preview Day 1 and save it to your schedule.', category: 'engagement', trigger_type: 'less_than_3_workouts' },
    { slug: 'challenge_invite', title: 'Challenge: 5 Workouts, 2 Weeks', body: 'Join the 2-week challenge — complete 5 workouts to earn a badge and 300 points. Join now!', category: 'engagement', trigger_type: 'challenge_invite' },
    { slug: 'coach_match', title: 'Coach match for you', body: 'We found coaches who match your goals. Tap to view profiles and book a discounted intro session.', category: 'engagement', trigger_type: 'coach_request' },
    { slug: 'session_reminder', title: 'Booked a session? Confirm it', body: 'Reminder: You have a coaching session with {{coach_name}} tomorrow. Review details or reschedule now.', category: 'engagement', trigger_type: 'booking_reminder_24h' },
    { slug: 'quick_cardio', title: 'Try this quick cardio blast', body: '12 minutes, no equipment. Tap to start a high-energy routine and burn calories fast.', category: 'engagement', trigger_type: 'cardio_users' },
    { slug: 'fat_burn_program', title: 'New Program: Fat Burn 4-Week', body: 'A new 4-week fat-burn program is live. Preview week 1 and enroll to get a tailored meal plan.', category: 'promo', trigger_type: 'fat_loss_interest' },
    { slug: 'weekly_summary', title: 'Your weekly summary is ready', body: 'See your week: workouts, calories, and progress. Tap to view insights and suggested next steps.', category: 'engagement', trigger_type: 'weekly_digest' },
    { slug: 'double_points', title: 'Earn double points today ✨', body: 'Today only: complete any workout and earn 2x points toward rewards. Open app to claim.', category: 'promo', trigger_type: 'promo_event' },
    { slug: 'badge_unlocked', title: 'New badge unlocked 🏅', body: 'Congrats — you unlocked Consistency. Open your profile to view badges and next goals.', category: 'engagement', trigger_type: 'badge_earned' },
    { slug: 'low_activity', title: 'Low activity — small wins', body: "Not much this week. Try our 7-minute reset to restart momentum — we'll celebrate with you.", category: 'inactivity', trigger_type: 'inactive_7_days' },
    { slug: 'nutrition_tip', title: 'Nutrition tip for today', body: 'Quick tip: add 20g protein to your next meal to support recovery. Tap for recipe ideas.', category: 'engagement', trigger_type: 'training_plan_users' },
    { slug: 'invite_friends', title: 'Invite friends — get rewards', body: 'Invite a friend. When they join and complete 3 workouts you both get 1 week premium free. Share now.', category: 'promo', trigger_type: 'growth_campaign' },
    { slug: 'workout_reminder', title: 'Workout ready in 3…2…1 🚀', body: 'Your scheduled workout starts in 10 minutes. Warm up now and show up strong.', category: 'engagement', trigger_type: 'scheduled_workout_10m' },
    { slug: 'coach_weekly_tip', title: 'Weekly coach tip from {{coach_name}}', body: '{{coach_name}} recommends one mobility drill to reduce soreness. Open to watch the 60s demo.', category: 'coach_tip', trigger_type: 'assigned_coach_weekly' },
    { slug: 'monthly_progress', title: 'Glance: progress vs last month', body: 'You improved endurance by 12% vs last month. Keep pushing — new plan suggestions inside.', category: 'engagement', trigger_type: 'monthly_progress' },
    { slug: 'trial_expiring', title: 'Your trial ends soon ⚠️', body: 'Your free trial ends in 3 days. Tap to subscribe and keep pro workouts and coach messages.', category: 'promo', trigger_type: 'trial_expiring_3d' },
    { slug: 'we_miss_you', title: 'We miss you, {{first_name}}', body: "It's been a while. Come back and complete any 10-min session to get 150 points.", category: 'inactivity', trigger_type: 'inactive_14_days' },
    { slug: 'hydration_check', title: 'Hydration check 💧', body: 'Quick nudge: drink water after your workout to speed recovery. Tap for a hydration plan.', category: 'engagement', trigger_type: 'post_workout' },
    { slug: 'seasonal_goal', title: 'Seasonal goal: Summer Ready', body: '8-week Summer Ready plan — tailored workouts + meals. Enroll now and save 20%.', category: 'promo', trigger_type: 'seasonal_campaign' },
    { slug: 'coach_respond', title: 'Respond to client request', body: 'You have a new client message — reply within 24h to increase booking conversion.', category: 'coach_tip', trigger_type: 'coach_new_message' },
    { slug: 'coach_boost', title: 'Coach tip: boost conversions', body: 'Update your coach bio and add a 60s intro video — profiles with video get 3x more bookings. Edit now.', category: 'coach_tip', trigger_type: 'coach_no_video' },
  ];
  for (const t of templates) {
    await pool.execute(
      `INSERT IGNORE INTO push_templates (slug, title, body, category, trigger_type) VALUES (?, ?, ?, ?, ?)`,
      [t.slug, t.title, t.body, t.category, t.trigger_type]
    );
  }
}

// ── Seed welcome messages ─────────────────────────────────────────────────────
async function seedWelcomeMessages() {
  const messages = [
    {
      target: 'user', channel: 'email',
      subject: "Welcome to Fitway Hub — Let's reach your first win!",
      title: 'Welcome to Fitway Hub',
      body: "Hi {{first_name}},\nWelcome to Fitway Hub! We're excited you're here. 🎉\n\nWhat to do next:\n\n✅ Complete your profile (fitness level & goals).\n✅ Take the 2-minute fitness assessment.\n✅ Pick a starter program or connect with a coach.\n\nNeed help? Reply to this email or visit the Help Center.\n\nWelcome aboard — one small habit at a time.\n— The Fitway Hub Team",
      html_body: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0A0A0B;color:#E5E5E5;border-radius:12px"><h1 style="color:#D4FF00;font-size:24px">Welcome to Fitway Hub! 🎉</h1><p>Hi {{first_name}},</p><p>We\'re excited you\'re here. Your fitness journey starts now!</p><h3 style="color:#D4FF00">What to do next:</h3><ul><li>✅ Complete your profile (fitness level &amp; goals)</li><li>✅ Take the 2-minute fitness assessment</li><li>✅ Pick a starter program or connect with a coach</li></ul><p>Need help? Reply to this email or visit the Help Center.</p><div style="text-align:center;margin:24px 0"><a href="{{app_url}}/app/onboarding" style="background:#D4FF00;color:#0A0A0B;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Get Started →</a></div><p style="color:#888;font-size:12px">Welcome aboard — one small habit at a time.<br>— The Fitway Hub Team</p></div>',
    },
    {
      target: 'user', channel: 'push',
      subject: '', title: 'Welcome to Fitway Hub 🎉',
      body: 'Your fitness journey starts now, {{first_name}}. Set your goals and unlock your first workout today.',
      html_body: null,
    },
    {
      target: 'user', channel: 'in_app',
      subject: '', title: 'Welcome, {{first_name}}! Ready for Day 1?',
      body: 'Set your goal now and get a personalized 7-day plan.',
      html_body: null,
    },
    {
      target: 'coach', channel: 'email',
      subject: 'Welcome to Fitway Hub Coach — Start building your client base',
      title: 'Welcome to Fitway Hub Coach',
      body: "Hi {{first_name}},\nWelcome to the Fitway Hub coach community — we're glad to have you!\n\nQuick setup checklist:\n\n✅ Complete your coach profile (bio, specialties, rates).\n✅ Upload credentials/certifications for verification.\n✅ Set your availability and coaching offerings.\n✅ Create your first program or coaching package.\n\nPro tips:\n• Add a short intro video (60s) — profiles with video convert better.\n• Offer a discounted trial session to get your first clients.\n\nWhen you're ready, publish your profile to go live and start receiving bookings.\n\nThanks for joining — let's help people get stronger together.\n— Fitway Hub Support",
      html_body: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0A0A0B;color:#E5E5E5;border-radius:12px"><h1 style="color:#D4FF00;font-size:24px">Welcome Coach! 🎉</h1><p>Hi {{first_name}},</p><p>Welcome to the Fitway Hub coach community — we\'re glad to have you!</p><h3 style="color:#D4FF00">Quick setup checklist:</h3><ul><li>✅ Complete your coach profile (bio, specialties, rates)</li><li>✅ Upload credentials/certifications for verification</li><li>✅ Set your availability and coaching offerings</li><li>✅ Create your first program or coaching package</li></ul><h3 style="color:#D4FF00">Pro tips:</h3><ul><li>Add a short intro video (60s) — profiles with video convert better</li><li>Offer a discounted trial session to get your first clients</li></ul><div style="text-align:center;margin:24px 0"><a href="{{app_url}}/coach/profile" style="background:#D4FF00;color:#0A0A0B;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">Complete Your Profile →</a></div><p style="color:#888;font-size:12px">Thanks for joining — let\'s help people get stronger together.<br>— Fitway Hub Support</p></div>',
    },
    {
      target: 'coach', channel: 'push',
      subject: '', title: 'Welcome Coach! 🎉',
      body: 'Hi {{first_name}} — welcome to Fitway Hub Coach! ⚡ Complete your profile and verify credentials to start accepting clients.',
      html_body: null,
    },
    {
      target: 'coach', channel: 'in_app',
      subject: '', title: 'Welcome, {{first_name}}!',
      body: 'Upload photo & bio, add specialties & rates, upload certifications, set availability, and publish your profile to start receiving clients.',
      html_body: null,
    },
  ];
  for (const m of messages) {
    await pool.execute(
      `INSERT IGNORE INTO welcome_messages (target, channel, subject, title, body, html_body) VALUES (?, ?, ?, ?, ?, ?)`,
      [m.target, m.channel, m.subject, m.title, m.body, m.html_body]
    );
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

  // Bilingual blog support (with logging for troubleshooting)
  console.log('🔄 Running blog_posts multilingual migrations...');
  
  try { 
    await pool.execute("ALTER TABLE blog_posts ADD COLUMN language VARCHAR(5) DEFAULT 'en'");
    console.log('✓ Added language column');
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) {
      console.log('Note: language column migration:', e.message || 'already exists');
    }
  }
  
  try { 
    await pool.execute("ALTER TABLE blog_posts ADD COLUMN related_blog_id INT");
    console.log('✓ Added related_blog_id column');
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) {
      console.log('Note: related_blog_id column migration:', e.message || 'already exists');
    }
  }
  
  try { 
    await pool.execute("ALTER TABLE blog_posts ADD COLUMN video_duration INT");
    console.log('✓ Added video_duration column');
  } catch (e: any) {
    if (!e.message?.includes('Duplicate column')) {
      console.log('Note: video_duration column migration:', e.message || 'already exists');
    }
  }
  
  // Fix slug uniqueness constraint for multilingual support
  try { 
    await pool.execute("ALTER TABLE blog_posts DROP INDEX slug");
    console.log('✓ Dropped old slug index');
  } catch (e: any) {
    // Index doesn't exist or already dropped - this is fine
  }
  
  try { 
    await pool.execute("ALTER TABLE blog_posts ADD UNIQUE KEY unique_slug_lang (slug, language)");
    console.log('✓ Added composite slug+language unique index');
  } catch (e: any) {
    if (!e.message?.includes('Duplicate key')) {
      console.log('Note: unique_slug_lang index:', e.message || 'already exists');
    }
  }
  
  try { 
    await pool.execute("ALTER TABLE blog_posts ADD INDEX idx_blog_posts_language (language)");
    console.log('✓ Added language index');
  } catch (e: any) {
    // Index already exists - this is fine
  }
  
  try { 
    await pool.execute("ALTER TABLE blog_posts ADD INDEX idx_blog_posts_related (related_blog_id)");
    console.log('✓ Added related_blog_id index');
  } catch (e: any) {
    // Index already exists - this is fine
  }
  
  try { 
    await pool.execute("ALTER TABLE blog_posts ADD CONSTRAINT fk_blog_posts_related FOREIGN KEY (related_blog_id) REFERENCES blog_posts(id) ON DELETE SET NULL");
    console.log('✓ Added foreign key constraint');
  } catch (e: any) {
    // Constraint already exists - this is fine
  }
  
  console.log('✅ Blog multilingual migrations complete');

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
      ['logo_url_en_light', '', 'image', 'branding', 'English Logo (Light Mode)'],
      ['logo_url_en_dark', '', 'image', 'branding', 'English Logo (Dark Mode)'],
      ['logo_url_ar_light', '', 'image', 'branding', 'Arabic Logo (Light Mode)'],
      ['logo_url_ar_dark', '', 'image', 'branding', 'Arabic Logo (Dark Mode)'],
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
      ['max_video_upload_size_mb', '40', 'number', 'access', 'Max Video Upload Size (MB)'],
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
  try { await pool.execute("ALTER TABLE users ADD COLUMN last_active DATETIME"); } catch {}

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

  // ── Video playlists ─────────────────────────────────────────
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS video_playlists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      thumbnail TEXT,
      created_by INT NOT NULL,
      is_public TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS playlist_videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      playlist_id INT NOT NULL,
      video_id INT NOT NULL,
      sort_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (playlist_id) REFERENCES video_playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES workout_videos(id) ON DELETE CASCADE,
      UNIQUE KEY unique_playlist_video (playlist_id, video_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  // ── Shorties flag on workout_videos ─────────────────────────
  try { await pool.execute("ALTER TABLE workout_videos ADD COLUMN is_short TINYINT(1) DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE workout_videos ADD COLUMN width INT DEFAULT 0"); } catch {}
  try { await pool.execute("ALTER TABLE workout_videos ADD COLUMN height INT DEFAULT 0"); } catch {}

  // ── Active sessions for IP-based single-account enforcement ─
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS active_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      token_hash VARCHAR(64) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_active_sessions_ip (ip_address),
      INDEX idx_active_sessions_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  // ── Website translations overrides ──────────────────────────
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS website_translations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      text_key VARCHAR(500) NOT NULL UNIQUE,
      text_ar TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  // ── Email server ────────────────────────────────────────────
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS email_settings (
      id INT PRIMARY KEY DEFAULT 1,
      smtp_host VARCHAR(255) NOT NULL DEFAULT '',
      smtp_port INT NOT NULL DEFAULT 587,
      smtp_user VARCHAR(255) NOT NULL DEFAULT '',
      smtp_pass VARCHAR(255) NOT NULL DEFAULT '',
      smtp_secure ENUM('none','tls','starttls') NOT NULL DEFAULT 'starttls',
      from_name VARCHAR(255) NOT NULL DEFAULT '',
      from_email VARCHAR(255) NOT NULL DEFAULT '',
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}
  try {
    await pool.execute(`INSERT IGNORE INTO email_settings (id) VALUES (1)`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS email_accounts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      display_name VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS emails (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_id INT NOT NULL,
      sender VARCHAR(500) NOT NULL,
      recipient VARCHAR(500) NOT NULL,
      subject VARCHAR(1000) NOT NULL DEFAULT '',
      text_body LONGTEXT,
      html_body LONGTEXT,
      direction ENUM('inbound','outbound') NOT NULL DEFAULT 'inbound',
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      message_id VARCHAR(500) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
      INDEX idx_emails_account_dir (account_id, direction),
      INDEX idx_emails_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  await seedDefaultAccounts();

  // ── Push notifications & welcome messages ───────────────────
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS push_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token TEXT NOT NULL,
      platform ENUM('android','ios','web') NOT NULL DEFAULT 'android',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_token (user_id, platform)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS push_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(100) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      category ENUM('new_user','new_coach','engagement','streak','inactivity','promo','coach_tip','system') NOT NULL DEFAULT 'engagement',
      trigger_type VARCHAR(100) NOT NULL DEFAULT 'manual',
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS push_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      template_id INT,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      status ENUM('sent','failed') NOT NULL DEFAULT 'sent',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (template_id) REFERENCES push_templates(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS welcome_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      target ENUM('user','coach') NOT NULL,
      channel ENUM('email','push','in_app') NOT NULL,
      subject VARCHAR(255) NOT NULL DEFAULT '',
      title VARCHAR(255) NOT NULL DEFAULT '',
      body LONGTEXT NOT NULL,
      html_body LONGTEXT,
      enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_target_channel (target, channel)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {}

  // Seed default push templates
  try { await seedPushTemplates(); } catch {}
  // Seed default welcome messages
  try { await seedWelcomeMessages(); } catch {}
}

export default pool;
