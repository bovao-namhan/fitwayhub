# FitWay Hub - Software Requirements Specification (SRS)

Version: 1.0  
Date: 2026-03-14  
System: FitWay Hub (Web + API + Android Wrapper)

## 1. Purpose
This document defines the complete Software Requirements Specification (SRS) for FitWay Hub, a full-stack fitness platform that includes:
- User fitness tracking and coaching
- Coach operations and athlete management
- Admin moderation and system operations
- Community, messaging, blog, ads, and payment workflows
- AI-assisted summaries and insights

This SRS is intended for product owners, developers, QA, DevOps, and future maintainers.

## 2. Product Scope
FitWay Hub provides a role-based platform where:
- Users track activity, consume workout content, subscribe to coaches, and receive plans
- Coaches manage subscriptions, athletes, plans, ads, earnings, and profile settings
- Admins control users/content/payments/branding/configuration and monitor platform operations

The platform includes:
- Web frontend (React + Vite)
- Node/Express backend (REST + Socket real-time)
- MySQL relational database
- Android app wrapper (Capacitor)

## 3. Definitions and Roles
- User: Regular athlete/end user of the app
- Coach: Professional trainer managing athlete subscriptions and plans
- Admin: Platform operator with moderation/configuration privileges
- Moderator: Elevated user role for moderation tasks (where applicable)
- Subscription: Paid relationship between a user and coach
- Booking: Coaching service request/session flow
- Plan: Coach-authored workout and/or nutrition program for user

## 4. System Overview
### 4.1 Architecture
- Frontend: React 19, React Router, TypeScript
- Backend: Express.js + TypeScript
- Database: MySQL 8
- Real-time: Socket.IO
- Mobile wrapper: Capacitor Android
- File uploads: Multer + image optimization

### 4.2 Main Components
- Auth and sessions
- User app modules (dashboard, steps, workouts, analytics, coaching, community, chat, blogs)
- Coach modules (dashboard, athletes, profile/settings, subscriptions, ads, chat, blogs)
- Admin modules (users, payments, subscriptions, withdrawals, videos, ads, CMS, notifications, email)
- Payment and subscription processing
- Push/email notification pipelines

## 5. Stakeholders
- End Users
- Coaches
- Admin Operations Team
- Support Team
- Engineering Team
- QA Team

## 6. Functional Requirements

## 6.1 Authentication and Authorization
### FR-AUTH-001
System shall support registration and login with email/password.

### FR-AUTH-002
System shall hash passwords and issue JWT-based access tokens.

### FR-AUTH-003
System shall support role-based route protection for User, Coach, Admin, and Moderator.

### FR-AUTH-004
System shall support social auth callbacks (Google/Facebook) where configured.

### FR-AUTH-005
System shall support password reset and account recovery flows.

## 6.2 User Onboarding and Profile
### FR-USER-001
System shall capture onboarding data (goals, metrics, activity level, medical info).

### FR-USER-002
System shall persist user profile and allow updates.

### FR-USER-003
System shall support trial/premium indicators and entitlement-aware access.

## 6.3 Steps and Activity Tracking
### FR-STEPS-001
System shall support daily step tracking and historical stats.

### FR-STEPS-002
System shall support manual and device-assisted activity inputs.

### FR-STEPS-003
System shall compute progress against daily step goals.

### FR-STEPS-004
System shall maintain weekly/monthly summaries and related analytics.

## 6.4 Workouts and Training Content
### FR-WORKOUT-001
System shall provide searchable/filterable workout videos.

### FR-WORKOUT-002
System shall support premium content locking based on entitlement.

### FR-WORKOUT-003
System shall support short-form videos (shorties).

### FR-WORKOUT-004
System shall support playlists and playlist video retrieval.

### FR-WORKOUT-005
System shall support user-specific assigned plans (workout and nutrition).

### FR-WORKOUT-006
System shall show a dedicated My Plan section and display assigned plan details.

## 6.5 Coaching Marketplace and Subscriptions
### FR-COACH-001
System shall list coaches with filter/sort by specialty, location, plan type, price, rating, and availability.

### FR-COACH-002
System shall show coach cards with profile details and social actions.

### FR-COACH-003
System shall support paid coach subscriptions (monthly/yearly), including request status tracking.

### FR-COACH-004
System shall support subscription lifecycle statuses:
- pending_admin
- pending_coach
- active
- rejected_admin
- rejected_by_coach
- refunded states

### FR-COACH-005
System shall expose user-facing subscription status per coach and prevent duplicate pending requests.

### FR-COACH-006
System shall display live subscription countdown (time remaining until expires_at) for active subscriptions.

### FR-COACH-007
Subscribed users shall not be prompted to book as the primary next action; instead, the UI shall guide users to coach-assigned plans.

### FR-COACH-008
When subscribed, coach card primary action shall be plan-focused:
- View My Plan if plan exists
- Awaiting Coach Plan if no plan assigned yet

### FR-COACH-009
System shall support coach reviews and ratings from users.

### FR-COACH-010
System shall support user gifts to coaches with eligibility checks.

## 6.6 Coaching Requests and Planning
### FR-PLAN-001
Coach shall be able to manage athlete list and profile summaries.

### FR-PLAN-002
Coach shall be able to create/update workout plans for athletes.

### FR-PLAN-003
Coach shall be able to create/update nutrition plans for athletes.

### FR-PLAN-004
Coach shall be able to set athlete step goals.

### FR-PLAN-005
Coach shall be able to view and process pending subscription requests:
- Accept (activates subscription and credits coach)
- Decline (marks refunded and notifies user)

### FR-PLAN-006
Coach settings/profile shall include a Subscriptions section with:
- Pending requests list
- Accept/Decline actions
- Active subscribers list with expiry date

## 6.7 Community and Social
### FR-COMM-001
System shall support creating community posts with text/media/hashtags.

### FR-COMM-002
System shall support likes and comments.

### FR-COMM-003
System shall support trending tags and tag filtering.

### FR-COMM-004
System shall support community challenges (create/join/progress).

### FR-COMM-005
System shall support coach follow/unfollow and follow status checks.

### FR-COMM-006
System shall support coach public profile presentation from community including:
- profile image and name
- follow button
- followers/statistics
- posts
- videos
- shorties
- photos

## 6.8 Chat and Real-Time Messaging
### FR-CHAT-001
System shall support one-to-one messaging between users/coaches.

### FR-CHAT-002
System shall support challenge/group chat contexts.

### FR-CHAT-003
System shall provide real-time message delivery and presence updates.

### FR-CHAT-004
System shall support file/media attachments in chat.

## 6.9 Ads System
### FR-ADS-001
Coach shall be able to create/edit/delete ad drafts and submit payment proof.

### FR-ADS-002
Admin shall approve/reject ads and ad payments.

### FR-ADS-003
System shall schedule ad boost windows using boost_start/boost_end.

### FR-ADS-004
System shall auto-expire ads when boost_end is reached.

### FR-ADS-005
Coach ads page shall display live countdown for active boosts (days/hours/minutes).

### FR-ADS-006
System shall track ad impressions and clicks.

### FR-ADS-007
System shall render sponsored ads in dashboard/community placements.

## 6.10 Blog and CMS
### FR-BLOG-001
System shall support multilingual blog content (English/Arabic), publish/draft states, and media.

### FR-BLOG-002
System shall support linked language versions and per-language slug handling.

### FR-CMS-001
Admin shall manage website sections using CMS.

### FR-CMS-002
CMS shall support section types including:
- hero
- stats
- features
- text_image
- cards
- cta
- contact_info
- calculator
- html
- latest_blogs
- team
- carousel
- faq

### FR-CMS-003
CMS admin editor shall provide edit UI for all supported section types.

## 6.11 Payments, Revenue, and Withdrawals
### FR-PAY-001
System shall support payment initiation methods required by configured channels (PayPal, e-wallet, etc.).

### FR-PAY-002
System shall support admin proof review and approve/reject operations.

### FR-PAY-003
System shall persist payment/subscription records with statuses and timestamps.

### FR-PAY-004
System shall credit coach earnings on accepted subscriptions according to configured cut.

### FR-PAY-005
Coach shall view credit balance, transaction history, and withdrawal history.

### FR-PAY-006
Coach shall submit withdrawal requests with configured payout details.

### FR-PAY-007
Admin shall process withdrawal requests.

## 6.12 Notifications and Email
### FR-NOTIF-001
System shall support push notifications and token registration.

### FR-NOTIF-002
System shall support in-app notification creation for important status changes.

### FR-NOTIF-003
System shall support admin-managed notification templates and blast operations.

### FR-EMAIL-001
System shall support SMTP sending and admin email tooling.

## 6.13 Admin Operations
### FR-ADMIN-001
Admin shall manage users (read/update/delete, role updates, premium toggles).

### FR-ADMIN-002
Admin shall manage videos including premium flags and coach assignment.

### FR-ADMIN-003
Admin shall manage ads and subscriptions.

### FR-ADMIN-004
Admin shall manage CMS website content and translations.

### FR-ADMIN-005
Admin shall manage payment settings and platform configuration.

## 7. Data Requirements
Core persisted entities include (non-exhaustive):
- users
- coach_profiles
- coach_subscriptions
- coaching_bookings
- workout_plans
- nutrition_plans
- workout_videos
- playlists and playlist_videos
- posts, post_comments, post_likes
- coach_reviews
- coach_follows
- coach_ads
- ad_payments
- payments
- withdrawals
- notifications
- app_settings
- website_sections
- blogs
- messages

Data fields and constraints are implemented in database initialization/migration logic.

## 8. External Interface Requirements

## 8.1 UI Requirements
- Responsive web UI for desktop/tablet/mobile
- Role-based navigation and route protection
- Arabic and English localization support
- Dark/light theme support

## 8.2 API Requirements
- RESTful endpoints under `/api/*`
- Authenticated routes require bearer token
- Status/validation errors returned in JSON with message

## 8.3 File Interface Requirements
- Upload endpoints for images/videos/proofs/attachments
- Static serving of uploaded assets through server path mapping

## 8.4 Mobile Interface Requirements
- Capacitor Android wrapper support
- API base URL configuration for device runtime

## 9. Non-Functional Requirements

## 9.1 Security
- Password hashing
- JWT auth
- Role-based route guards
- Input validation and upload checks
- Sensitive admin routes protected by role checks

## 9.2 Reliability and Integrity
- Database-backed persistence for critical workflows
- Status-driven subscription/payment transitions
- Auto-expiry checks for time-bounded entities (ads/subscriptions)

## 9.3 Performance
- Paginated/limited list endpoints where needed
- Efficient filtering/sorting in UI and API
- Real-time features optimized via Socket events

## 9.4 Usability
- Clear status badges for pending/active/rejected flows
- Direct CTAs aligned with business flow (subscription -> plan assignment)
- Human-readable countdowns for time-bound subscriptions/ads

## 9.5 Maintainability
- Modular route files and page modules
- TypeScript typing across app and API
- Configurable platform settings through admin panel

## 10. Business Rules
- Only active coach subscriptions grant subscribed state.
- Pending subscription requests block duplicate request creation.
- Coach must explicitly accept pending_coach requests before subscription becomes active.
- Active subscriptions have expires_at and are time-bound.
- Subscription is not equivalent to booking; subscription enables coach plan workflow.
- Coach earnings are credited only on accepted/active payment flow.

## 11. Assumptions and Constraints
- MySQL service is available and configured.
- Required environment variables are correctly set for auth/payment/notifications.
- Payment providers may run in sandbox or production modes based on settings.
- Some features depend on role-specific data setup (coach profiles, pricing, plan creation).

## 12. Acceptance Criteria Summary
The system is accepted when:
1. User can subscribe to coach and view accurate status progression.
2. Subscribed coach action is plan-focused, not booking-focused.
3. Coach can process subscription requests in settings and see active subscribers.
4. User sees subscription countdown and expiry details.
5. Coach ads display live countdown and auto-expire correctly.
6. Community coach profile includes posts/videos/shorties/photos with follow stats.
7. Admin can assign videos to coaches and manage critical workflows.
8. CMS supports all section types with working editors.

## 13. Run and Build
```bash
npm install
npm run dev
npx vite
```

Additional scripts:
- `npm run build`
- `npm run lint`
- `npm run seed`
- `npm run build:android`
- `npm run cap:run`

## 14. Revision Notes
- Added coach settings subscriptions section (pending + active)
- Added coach profile media endpoints (videos, shorties, photos)
- Added live countdown for subscriptions and ads
- Corrected subscription UX from booking action to plan action
- Added full CMS editor coverage for all supported section types
