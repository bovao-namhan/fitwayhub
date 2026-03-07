import { Outlet } from "react-router-dom";
import {
  Home, Dumbbell, Users, MessageSquare, User,
  Wrench, TrendingUp, UserCheck, Activity, Video, FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBranding, getBrandLogoForLang } from "@/context/BrandingContext";
import { useI18n } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { SharedSidebar, NavItem } from "@/components/layout/SharedSidebar";

const allNavItems: NavItem[] = [
  { path: "/app/dashboard",  icon: Home,          label: "Dashboard" },
  { path: "/app/workouts",   icon: Dumbbell,      label: "Workouts" },
  { path: "/app/steps",      icon: Activity,      label: "Steps" },
  { path: "/app/analytics",  icon: TrendingUp,    label: "Analytics" },
  { path: "/app/coaching",   icon: UserCheck,     label: "Coaching" },
  { path: "/app/meetings",   icon: Video,         label: "Meetings" },
  { path: "/app/blogs",      icon: FileText,      label: "No Pain No Shawerma" },
  { path: "/app/community",  icon: Users,         label: "Community" },
  { path: "/app/chat",       icon: MessageSquare, label: "Chat" },
  { path: "/app/tools",      icon: Wrench,        label: "Tools" },
  { path: "/app/profile",    icon: User,          label: "Profile" },
];

const bottomNavItems: NavItem[] = [
  { path: "/app/dashboard",  icon: Home,          label: "Home" },
  { path: "/app/workouts",   icon: Dumbbell,      label: "Workouts" },
  { path: "/app/steps",      icon: Activity,      label: "Steps" },
  { path: "/app/community",  icon: Users,         label: "Community" },
  { path: "/app/profile",    icon: User,          label: "Profile" },
];

const moreDrawerItems: NavItem[] = [
  { path: "/app/analytics",  icon: TrendingUp,    label: "Analytics" },
  { path: "/app/coaching",   icon: UserCheck,     label: "Coaching" },
  { path: "/app/meetings",   icon: Video,         label: "Meetings" },
  { path: "/app/blogs",      icon: FileText,      label: "No Pain No Shawerma" },
  { path: "/app/chat",       icon: MessageSquare, label: "Chat" },
  { path: "/app/tools",      icon: Wrench,        label: "Tools" },
];

export function AppLayout() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { lang } = useI18n();
  const { isDark } = useTheme();
  const isRtl = lang === "ar";
  const brandLogo = getBrandLogoForLang(branding, lang, isDark);

  const pointsFooter = (
    <div style={{
      padding: "12px 14px",
      backgroundColor: "var(--accent-dim)",
      border: "1px solid rgba(200,255,0,0.2)",
      borderRadius: 12,
    }}>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>Total Points</p>
      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>
        {user?.points?.toLocaleString() ?? 0}
      </p>
    </div>
  );

  const { isMobile, sidebarW, DesktopSidebar, OverlayDrawer, MobileTopBar, MobileBottomBar } = SharedSidebar({
    navItems: allNavItems,
    bottomNavItems,
    moreDrawerItems,
    accentColor: "var(--accent)",
    accentBg: "var(--accent-dim)",
    logoIcon: Activity,
    logoIconColor: "var(--accent)",
    logoLabel: branding.app_name || "FITWAY HUB",
    logoUrl: brandLogo || undefined,
    roleLabel: user?.isPremium ? "⚡ Premium" : "Free Plan",
    roleLabelColor: "var(--accent)",
    extraFooter: pointsFooter,
  });

  return (
    <div style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", minHeight: "100dvh", display: "flex" }}>
      {/* Desktop: persistent sidebar with hamburger inside it */}
      {!isMobile && <DesktopSidebar />}

      {/* Overlay drawer — triggered by hamburger on BOTH desktop and mobile */}
      <OverlayDrawer />

      {/* Mobile-only top bar with hamburger */}
      {isMobile && <MobileTopBar />}

      <main style={{
        flex: 1,
        minWidth: 0,
        overflowX: "hidden",
        marginLeft: isMobile ? 0 : (isRtl ? 0 : sidebarW),
        marginRight: isMobile ? 0 : (isRtl ? sidebarW : 0),
        transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
        minHeight: "100vh",
        paddingTop: isMobile ? 56 : 0,
        paddingBottom: isMobile ? "calc(64px + env(safe-area-inset-bottom))" : 0,
      }}>
        <Outlet />
      </main>

      {/* Mobile-only bottom tab bar */}
      {isMobile && <MobileBottomBar />}
    </div>
  );
}
