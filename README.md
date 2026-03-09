# 🏋️ FitWay Hub

A full-stack fitness platform with real-time coaching, video meetings, AI-powered analytics, community features, and a native mobile app — built with React 19, Express.js, MySQL, Socket.IO, and Capacitor.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Recharts, Lucide Icons |
| Backend | Express.js, MySQL2, Socket.IO, JWT, bcryptjs, Nodemailer |
| AI | Google Gemini 2.5 Flash |
| Push Notifications | Firebase Cloud Messaging (FCM Legacy + v1) |
| Email | Built-in SMTP server (port 2525), Nodemailer outbound |
| Maps | Leaflet + OpenStreetMap |
| Video Calls | WebRTC + Socket.IO signaling |
| Mobile | Capacitor 8 (Android), standalone Gradle project |
| Validation | Zod, React Hook Form |
| File Uploads | Multer |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start MySQL (if not running)
sudo service mysql start

# 3. Start dev server (API on :3000)
npm run dev

# 4. Start frontend (Vite on :5173)
npx vite
```

Set `VITE_API_BASE` in `.env` to your backend URL. For Capacitor/Android builds it defaults to `https://peter-adel.taila6a2b4.ts.net`.


## Default Accounts

| Role | Email | Password | URL |
|------|-------|----------|-----|
| 👑 Admin | peteradmin@example.com | peterishere | /admin/dashboard |
| 🏅 Coach | petercoach@example.com | peterishere | /coach/dashboard |
| 👤 User | test@example.com | password123 | /app/dashboard |

---

## Features

### 🔐 Authentication & Security
- **Email/Password** registration and login with bcrypt hashing and JWT tokens (30-day expiry)
- **Google & Facebook OAuth** — social login with automatic account creation
- **Email domain validation** — DNS MX/A/AAAA record checks block disposable/fake emails
- **Role-based access control** — Admin, Coach, Moderator, User roles with protected routes
- **Remember Me** — persistent token-based auto-login
- **Forgot/Reset Password** — self-service password recovery flow
- **Cross-tab sync** — auth state synchronizes across browser tabs via `StorageEvent`
- **7-day free trial** — new signups get premium trial with countdown
- **Coach membership gate** — coaches require active paid membership to log in

### 📋 Onboarding
- **4-step guided wizard** with progress bar and per-step Zod validation
- Goal selection (lose weight, maintain, gain weight, build muscle)
- Body metrics (gender, DOB, height, weight)
- Activity level and medical history
- Personalized targets (target weight, weekly goal, daily steps)
- Data persists to server on completion

### 📊 User Dashboard
- **Stat cards** — steps, calories, water intake, active minutes at a glance
- **Step goal progress** — visual progress bar with editable goal (coach-settable)
- **Today's plan** — workout exercises by day-of-week and nutrition/meal plan
- **Quick tools** — one-tap access to BMI, Macros, Steps, Water calculators
- **Ad carousel** — auto-rotating sponsored banners from coaches
- **Featured coaches** — promoted coach spotlight cards
- **AI step analysis** — Gemini-powered daily performance rating and motivational insights

### 🚶 Steps & Activity Tracking
- **Live GPS tracking** — real-time route on OpenStreetMap with glowing polyline and pulsing marker
- **Accelerometer steps** — device motion-based step counting with peak detection
- **Kalman filter** — GPS signal smoothing for accurate distance measurement
- **Manual entry** — walking/running modes with automatic distance↔steps conversion using user height/weight
- **SVG progress ring** — animated circular step goal indicator
- **Weekly/monthly stats** — historical daily breakdowns
- **Offline storage & sync** — steps saved to localStorage when offline, synced via `/offline-steps` on reconnect
- **Calorie burn calculation** — MET-based formula (different for walking vs running)
- **Distance units** — user-selectable km, m, or cm
- **Goal completion rewards** — +2 points on reaching daily step goal

### 💪 Workouts
- **Video library** — browsable exercise catalog with search and category filters (HIIT, Strength, Cardio, Yoga, Mobility)
- **Premium content lock** — gated videos for paying users with lock overlay
- **Video player modal** — YouTube embed, Vimeo embed, and direct playback
- **Watch rewards** — +2 points after 30 seconds of video engagement
- **My Plan** — coach-assigned personal workout + nutrition plan with macro breakdown

### 📈 Analytics (Premium)
- **Weekly steps chart** — Recharts bar chart with day-by-day data
- **Calories trend** — area chart of calorie burn over time
- **Metric cards** — avg daily steps, total sessions, calories burned, consistency %
- **Recent sessions** — list with type, duration, calories
- **AI insights** — Gemini-generated trend analysis of fitness data
- Premium-gated with redirect to pricing for free users

### 👥 Community & Social
- **Social feed** — user-generated text + media posts with image/video upload
- **Hashtags** — `#tag` support with trending tags sidebar and tag filtering
- **Likes & comments** — post engagement with threaded comments
- **Sponsored ads** — interspersed ad posts every 4th position in feed
- **Fitness challenges** — create/join community challenges with dates, progress bars, active/upcoming/ended status
- **Coach follow system** — follow/unfollow coaches from their profiles
- **Post moderation** — admin can delete/hide content; admin stats bar

### 💬 Chat & Messaging
- **Direct messaging** — 1:1 conversations between users and coaches
- **Real-time delivery** — instant messages via Socket.IO
- **Online presence** — green dots for online users with 3-second polling fallback
- **Media/file sharing** — upload images and files within conversations
- **Group/challenge chat** — multi-user chat rooms tied to community challenges
- **Contact list** — searchable directory with role badges and status colors

### 🏅 Coaching System
- **Coach marketplace** — searchable directory with filters: specialty, location, plan type, price range, rating, experience, availability
- **Coach profiles** — ratings, reviews, pricing, specialties, follower count
- **Subscription booking** — monthly/yearly plans (complete, workout-only, nutrition-only)
- **Multi-stage approval** — `pending_admin` → `pending_coach` → `active` (or `rejected`)
- **Body photo uploads** — "now" and "dream body" images during booking
- **Reviews & ratings** — star rating + text review displayed on coach profiles
- **Gift sending** — send points/gifts to coaches

### 📹 Meetings & Video Calls
- **Meeting scheduling** — create meetings with title, participant, date/time
- **WebRTC video calls** — peer-to-peer with full offer/answer/ICE exchange
- **Audio/video controls** — mute mic, disable camera toggles
- **Screen sharing** — share desktop/window via `getDisplayMedia`
- **In-call chat** — real-time text messaging alongside video
- **File sharing** — upload and share files via drag-and-drop during calls
- **Collaborative notes** — auto-saving meeting notes synced between participants via Socket.IO
- **Call timer** — running duration display during active calls
- **PiP local video** — draggable picture-in-picture self-view overlay
- **Meeting management** — status filters (all/scheduled/active/ended), reschedule, delete

### 🤖 AI Features
- **Step analysis** — Google Gemini 2.5 Flash generates performance rating, health advice, motivational message, and tomorrow's goal
- **Analytics insights** — AI-generated contextual trend summaries
- **Daily summary persistence** — AI output stored per user per day in `DailySummary` model

### � Push Notifications & Welcome Messages
- **FCM integration** — Firebase Cloud Messaging with dual support: Legacy API (server key) and HTTP v1 (service account JWT)
- **35+ notification templates** — categorized: new_user, new_coach, engagement, streak, inactivity, promo, coach_tip, system
- **Template tokens** — `{{first_name}}`, `{{streak_days}}`, `{{coach_name}}`, `{{app_url}}` with dynamic replacement
- **Welcome messages** — automatic email + push + in-app notification for new user and coach registration
- **Segment blasting** — send push to all users, coaches only, premium users, or inactive (7d+) users
- **Push log** — full audit trail of all sent notifications with status tracking
- **Admin notification UI** — manage templates, welcome messages, send pushes, and view logs from `/admin/notifications`
- **Device token management** — register/remove FCM tokens per user per platform (Android/iOS/Web)

### 📧 Email Server
- **Built-in SMTP server** — smtp4dev-style server on port 2525 for receiving and testing emails
- **SMTP sending** — Nodemailer integration for outbound emails via configured SMTP settings
- **Email accounts** — create multiple sender accounts with custom display names
- **System email fallback** — `sendSystemEmail()` works without email accounts using SMTP settings directly
- **Admin email UI** — compose, send, and manage emails from `/admin/email`

### 🛡️ Admin Panel
- **Overview dashboard** — platform-wide aggregate KPI stats
- **User management** — full CRUD: create, edit, delete users; change roles; toggle premium; adjust points; view medical history
- **Coach management** — coach-specific admin controls
- **Payment tracking** — proof image verification, approve/reject transactions
- **Video management** — upload/manage workout videos with categories, premium flag, thumbnails
- **Ad moderation** — approve/reject coach-submitted ads with admin notes
- **Gift system** — send points, premium access, badges, coupons to any user
- **Community moderation** — announcements, pin/hide/delete posts
- **App configuration** — platform-wide key-value settings
- **Website CMS** — section-based page editor for Home, About, Contact with 13 section types and sort ordering
- **Notification management** — push templates, welcome messages, segment blasting, push log viewer
- **Email server** — compose/send emails, manage SMTP settings and accounts
- **Payment settings** — PayPal credentials, e-wallet phone number, coach cut (90%)
- **Server configuration** — server URL setting with connectivity test button
- **Subscription management** — view, approve, reject coaching subscriptions
- **Withdrawal handling** — process coach payout requests
- **Admin chat** — direct communication channel with users/coaches

### 🏅 Coach Panel
- **Dashboard** — athletes count, pending requests, sessions/week, revenue, avg rating, completion %, weekly sessions chart
- **Athlete management** — view subscribed athletes with search, detail tabs (overview, workout, nutrition)
- **Workout plan builder** — exercise name, sets, reps, rest time, day assignment per athlete
- **Nutrition plan builder** — plan title, macro targets (cal/protein/carbs/fat), meals with time/calories/foods
- **Step goal setting** — set per-athlete daily step goals
- **Coaching requests** — accept/reject incoming subscription requests
- **Ad creation** — self-service ads (community feed or home banner) with media upload, duration pricing (4 EGP/min)
- **Profile management** — edit bio, specialties, pricing, availability

### 💳 Payment System
- **Premium plans** — Free tier vs Premium (50 EGP/month or 450 EGP/year, 25% annual savings)
- **E-wallet payments** — transfer to configured phone number with proof image upload
- **PayPal integration** — sandbox API with token auth, order creation/capture
- **Payment proof verification** — admin review/approve/reject with image preview
- **Coach revenue split** — 90% to coach, 10% platform fee
- **Coach withdrawals** — request and process coach earnings payout
- **Result pages** — success, cancel, and error post-payment screens

### 🧰 Fitness Calculators
- **BMI Calculator** — height + weight input with color-coded result categories
- **Calorie Calculator** — daily calorie needs estimator
- **Hydration Calculator** — daily water intake based on weight + activity level
- **Macro Calculator** — macronutrient breakdown with 200+ food database

### 🎮 Points & Gamification
- **Signup bonus** — configurable welcome points (default 200) on registration
- **Video rewards** — +2 points after 30 seconds of watching
- **Step goal rewards** — +2 points on daily step goal completion
- **Transaction history** — full points ledger on profile
- **Points display** — visible on profile, dashboard, and admin user management

### 🌍 Internationalization (i18n)
- **Bilingual** — English and Arabic with 200+ translation keys
- **Language selection** — user-selectable in profile settings
- **RTL support** — full right-to-left layout for Arabic
- **Per-language branding** — different logos configurable per language

### 🌓 Theme System
- **Dark/Light mode** — one-click toggle available in all layouts
- **Persistence** — theme saved to localStorage across sessions
- **System preference** — reads `prefers-color-scheme` media query as default
- **Map tile switching** — theme-aware dark/light OpenStreetMap tiles

### 🎨 Branding / White-Label
- **Dynamic branding** — app name, tagline, logos fetched from backend settings
- **CSS variable theming** — primary, secondary, background colors injected at runtime
- **Font customization** — separate fonts for English, Arabic, and headings
- **Social links** — configurable social media URLs
- **Splash screen** — branded loading screen while config loads
- **LocalStorage cache** — offline branding fallback

### 📱 Mobile & Responsive
- **Fully responsive** — all pages adapt to mobile/tablet with isMobile breakpoints at 768px
- **Mobile navigation** — floating bottom nav bar on app pages
- **Collapsible sidebar** — hamburger menu on tablet and mobile
- **Android app** — Capacitor 8 native wrapper (`com.peetrix.fitwayhub`) with standalone Gradle project
- **Native GPS** — Capacitor geolocation plugin for activity tracking
- **Native splash screen** — Capacitor splash screen plugin

### ⚡ Real-Time (Socket.IO)
- **Online presence** — live user status with multi-device support
- **WebRTC signaling** — offer/answer/ICE candidate relay for video calls
- **Chat delivery** — instant message push
- **Meeting rooms** — scoped join/leave events
- **Typing indicators** — "user is typing…" broadcast
- **Notes sync** — collaborative meeting notes
- **File notifications** — real-time alerts on file shares

### 📁 File Upload System
- **Image uploads** — Multer with image MIME filter, 5MB limit
- **Video uploads** — Multer with video/image filter, 500MB limit
- **Static serving** — Express static middleware on `/uploads`
- **Use cases** — avatars, post media, chat attachments, medical files, body photos, ad media, payment proofs, video thumbnails, meeting files

---

## Social Login Setup

To enable Google/Facebook login, add to `.env`:

```bash
APP_BASE_URL=http://localhost:3000

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/oauth/google/callback

FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/oauth/facebook/callback
```

Provider console callback URLs must exactly match the redirect URIs above.

---

## Database

- **Engine**: MySQL 8
- **Auto-created**: tables and default accounts seeded on first run

To re-seed:
```bash
npm run seed
npm run dev
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API server (port 3000) |
| `npx vite` | Start Vite frontend (port 5173) |
| `npm run build` | Production build |
| `npm run seed` | Seed database |
| `npm run lint` | TypeScript type check |
| `npm run build:android` | Build + sync Android |
| `npm run cap:run` | Run on Android device |

---

## Project Structure

```
├── server.ts                # Express + Socket.IO entry point
├── run-server.ts            # Server launcher with MySQL retry
├── server/
│   ├── config/database.ts   # MySQL connection, table init & seeding
│   ├── controllers/         # Route handlers (auth, AI, chat, coaching, etc.)
│   ├── emailServer.ts       # Built-in SMTP server & email sending
│   ├── notificationService.ts # FCM push, welcome messages, in-app notifications
│   ├── middleware/          # Auth, error handling, file upload
│   ├── models/              # DailySummary, User
│   └── routes/              # 20 route modules
├── src/
│   ├── App.tsx              # React router with all routes
│   ├── context/             # AuthContext, BrandingContext, I18nContext, ThemeContext
│   ├── layouts/             # App, Admin, Coach, Website layouts
│   ├── components/          # Reusable UI (calculators, map, CMS renderer, sidebar)
│   ├── pages/
│   │   ├── app/             # User pages (Dashboard, Steps, Workouts, etc.)
│   │   ├── coach/           # Coach pages (Dashboard, Athletes, Ads, etc.)
│   │   ├── admin/           # Admin pages (Dashboard, WebsiteCMS, EmailServer, Notifications)
│   │   ├── auth/            # Login, Register, SocialCallback
│   │   └── website/         # Public CMS pages
│   └── lib/                 # API helpers, utilities, step calculations
├── FitWayHub-Android/       # Standalone Android Gradle project (AGP 8.5.2, SDK 34)
└── uploads/                 # User-uploaded files
```
