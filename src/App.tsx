/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { I18nProvider } from '@/context/I18nContext';
import { BrandingProvider, useBranding } from "@/context/BrandingContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useEffect, lazy, Suspense } from "react";

const AppLayout = lazy(() => import("@/layouts/AppLayout").then((m) => ({ default: m.AppLayout })));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const CoachLayout = lazy(() => import("@/layouts/CoachLayout").then((m) => ({ default: m.CoachLayout })));
const WebsiteLayout = lazy(() => import("@/layouts/WebsiteLayout").then((m) => ({ default: m.WebsiteLayout })));

const CmsPage = lazy(() => import("@/pages/website/CmsPage"));
const WebsiteBlogs = lazy(() => import("@/pages/website/Blogs"));
const WebsiteBlogPost = lazy(() => import("@/pages/website/BlogPost"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const SocialCallback = lazy(() => import("@/pages/auth/SocialCallback"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const Workouts = lazy(() => import("@/pages/app/Workouts"));
const Community = lazy(() => import("@/pages/app/Community"));
const Chat = lazy(() => import("@/pages/app/Chat"));
const Profile = lazy(() => import("@/pages/app/Profile"));
const Tools = lazy(() => import("@/pages/app/Tools"));
const Plans = lazy(() => import("@/pages/app/Plans"));
const Pricing = lazy(() => import("@/pages/app/Pricing"));
const Analytics = lazy(() => import("@/pages/app/Analytics"));
const Coaching = lazy(() => import("@/pages/app/Coaching"));
const Onboarding = lazy(() => import("@/pages/app/Onboarding"));
const Steps = lazy(() => import("@/pages/app/Steps"));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const CoachDashboard = lazy(() => import("@/pages/coach/Dashboard"));
const CoachRequests = lazy(() => import("@/pages/coach/Requests"));
const CoachAthletes = lazy(() => import("@/pages/coach/Athletes"));
const CoachChat = lazy(() => import("@/pages/coach/Chat"));
const CoachAds = lazy(() => import("@/pages/coach/Ads"));
const CoachCommunity = lazy(() => import("@/pages/coach/Community"));
const CoachProfile = lazy(() => import("@/pages/coach/Profile"));
const CoachBlogs = lazy(() => import("@/pages/coach/Blogs"));
const PaymentResult = lazy(() => import("@/pages/PaymentResult"));
const AppBlogs = lazy(() => import("@/pages/app/Blogs"));
const AdminBlogs = lazy(() => import("@/pages/admin/Blogs"));
const AdminEmailServer = lazy(() => import("@/pages/admin/EmailServer"));
const AdminNotifications = lazy(() => import("@/pages/admin/Notifications"));

function SmartRedirect() {
  // Handled in AuthContext login flow
  return <Navigate to="/auth/login" replace />;
}

export default function App() {
  function SplashGate() {
    const { isReady } = useBranding();

    useEffect(() => {
      if (!isReady) return;
      const splash = document.getElementById('splash-loader');
      if (splash) splash.remove();
    }, [isReady]);

    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <BrandingProvider>
          <SplashGate />
          <BrowserRouter>
            <Suspense fallback={null}>
            <Routes>
              {/* Public Website Routes */}
              <Route element={<WebsiteLayout />}>
                <Route path="/" element={<CmsPage page="home" />} />
                <Route path="/about" element={<CmsPage page="about" />} />
                <Route path="/contact" element={<CmsPage page="contact" />} />
                <Route path="/blogs" element={<WebsiteBlogs />} />
                <Route path="/blogs/:slug" element={<WebsiteBlogPost />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/social-callback" element={<SocialCallback />} />

              {/* User App Routes */}
              <Route path="/app/login" element={<Navigate to="/auth/login" replace />} />
              <Route path="/app/onboarding" element={
                <ProtectedRoute role="user">
                  <Onboarding />
                </ProtectedRoute>
              } />
              
              <Route element={
                <ProtectedRoute role="user">
                  <AppLayout />
                </ProtectedRoute>
              }>
                <Route path="/app/dashboard" element={<Dashboard />} />
                <Route path="/app/workouts" element={<Workouts />} />
                <Route path="/app/steps" element={<Steps />} />
                <Route path="/app/community" element={<Community />} />
                <Route path="/app/chat" element={<Chat />} />
                <Route path="/app/profile" element={<Profile />} />
                <Route path="/app/tools" element={<Tools />} />
                <Route path="/app/plans" element={<Plans />} />
                <Route path="/app/pricing" element={<Pricing />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/coaching" element={<Coaching />} />
                <Route path="/app/blogs" element={<AppBlogs />} />
              </Route>

              {/* Coach Routes */}
              <Route path="/coach" element={<Navigate to="/coach/dashboard" replace />} />
              <Route element={
                <ProtectedRoute role="coach">
                  <CoachLayout />
                </ProtectedRoute>
              }>
                <Route path="/coach/dashboard" element={<CoachDashboard />} />
                <Route path="/coach/requests" element={<CoachRequests />} />
                <Route path="/coach/athletes" element={<CoachAthletes />} />
                <Route path="/coach/chat" element={<CoachChat />} />
                <Route path="/coach/ads" element={<CoachAds />} />
                <Route path="/coach/community" element={<CoachCommunity />} />
                <Route path="/coach/profile" element={<CoachProfile />} />
                <Route path="/coach/blogs" element={<CoachBlogs />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route element={
                <ProtectedRoute role="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminDashboard />} />
                <Route path="/admin/coaches" element={<AdminDashboard />} />
                <Route path="/admin/payments" element={<AdminDashboard />} />
                <Route path="/admin/videos" element={<AdminDashboard />} />
                <Route path="/admin/ads" element={<AdminDashboard />} />
                <Route path="/admin/chat" element={<AdminDashboard />} />
                <Route path="/admin/gifts" element={<AdminDashboard />} />
                <Route path="/admin/settings" element={<AdminDashboard />} />
                <Route path="/admin/website" element={<AdminDashboard />} />
                <Route path="/admin/community" element={<AdminDashboard />} />
                <Route path="/admin/subscriptions" element={<AdminDashboard />} />
                <Route path="/admin/withdrawals" element={<AdminDashboard />} />
                <Route path="/admin/blogs" element={<AdminBlogs />} />
                <Route path="/admin/email" element={<AdminEmailServer />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
              </Route>

              {/* Payment Result Routes */}
              <Route path="/payment/success" element={<PaymentResult result="success" />} />
              <Route path="/payment/cancel" element={<PaymentResult result="cancel" />} />
              <Route path="/payment/error" element={<PaymentResult result="error" />} />

              {/* Catch all redirect */}
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
          </BrandingProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
