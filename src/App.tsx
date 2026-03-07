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
import { useEffect } from "react";

import { AppLayout } from "@/layouts/AppLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { CoachLayout } from "@/layouts/CoachLayout";

// public website pages restored — CMS-driven pages
import { WebsiteLayout } from "@/layouts/WebsiteLayout";
import CmsPage from "@/pages/website/CmsPage";
import WebsiteBlogs from "@/pages/website/Blogs";

import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import SocialCallback from "@/pages/auth/SocialCallback";

import Dashboard from "@/pages/app/Dashboard";
import Workouts from "@/pages/app/Workouts";
import Community from "@/pages/app/Community";
import Chat from "@/pages/app/Chat";
import Profile from "@/pages/app/Profile";
import Tools from "@/pages/app/Tools";
import Pricing from "@/pages/app/Pricing";
import Analytics from "@/pages/app/Analytics";
import Coaching from "@/pages/app/Coaching";
import Onboarding from "@/pages/app/Onboarding";
import Steps from "@/pages/app/Steps";
import Meetings from "@/pages/app/Meetings";
import MeetingRoom from "@/pages/app/MeetingRoom";

import AdminDashboard from "@/pages/admin/Dashboard";
import CoachDashboard from "@/pages/coach/Dashboard";
import CoachRequests from "@/pages/coach/Requests";
import CoachAthletes from "@/pages/coach/Athletes";
import CoachChat from "@/pages/coach/Chat";
import CoachAds from "@/pages/coach/Ads";
import CoachCommunity from "@/pages/coach/Community";
import CoachProfile from "@/pages/coach/Profile";
import PaymentResult from "@/pages/PaymentResult";
import AppBlogs from "@/pages/app/Blogs";

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
            <Routes>
              {/* Public Website Routes */}
              <Route element={<WebsiteLayout />}>
                <Route path="/" element={<CmsPage page="home" />} />
                <Route path="/about" element={<CmsPage page="about" />} />
                <Route path="/contact" element={<CmsPage page="contact" />} />
                <Route path="/blogs" element={<WebsiteBlogs />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
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
                <Route path="/app/pricing" element={<Pricing />} />
                <Route path="/app/analytics" element={<Analytics />} />
                <Route path="/app/coaching" element={<Coaching />} />
                <Route path="/app/meetings" element={<Meetings />} />
                <Route path="/app/blogs" element={<AppBlogs />} />
              </Route>

              {/* Meeting Room (full-screen, no layout) */}
              <Route path="/app/meeting/:roomId" element={
                <ProtectedRoute role="user">
                  <MeetingRoom />
                </ProtectedRoute>
              } />

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
                <Route path="/coach/meetings" element={<Meetings />} />
              </Route>

              {/* Coach Meeting Room (full-screen, no layout) */}
              <Route path="/coach/meeting/:roomId" element={
                <ProtectedRoute role="coach">
                  <MeetingRoom />
                </ProtectedRoute>
              } />

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
                <Route path="/admin/app-config" element={<AdminDashboard />} />
              </Route>

              {/* Payment Result Routes */}
              <Route path="/payment/success" element={<PaymentResult result="success" />} />
              <Route path="/payment/cancel" element={<PaymentResult result="cancel" />} />
              <Route path="/payment/error" element={<PaymentResult result="error" />} />

              {/* Catch all redirect */}
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </BrowserRouter>
          </BrandingProvider>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
