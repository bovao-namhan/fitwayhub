import { Outlet } from "react-router-dom";
import {
  Home, Dumbbell, Users, MessageSquare, User,
  Wrench, TrendingUp, UserCheck, Activity, FileText, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBranding, getBrandLogoForLang } from "@/context/BrandingContext";
import { useI18n } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { SharedSidebar, NavItem } from "@/components/layout/SharedSidebar";

export function AppLayout() {
  const { user } = useAuth();
  const { branding } = useBranding();
  const { lang, t } = useI18n();
  const { isDark } = useTheme();
  const isRtl = lang === "ar";
  const brandLogo = getBrandLogoForLang(branding, lang, isDark);

  const allNavItems: NavItem[] = [
    { path: "/app/dashboard",  icon: Home,          label: t("dashboard") },
    { path: "/app/workouts",   icon: Dumbbell,      label: t("nav_workouts") },
    { path: "/app/steps",      icon: Activity,      label: t("nav_steps") },
    { path: "/app/analytics",  icon: TrendingUp,    label: t("nav_analytics") },
    { path: "/app/coaching",   icon: UserCheck,     label: t("nav_coaching") },
    { path: "/app/blogs",      icon: FileText,      label: t("blog_title") },
    { path: "/app/community",  icon: Users,         label: t("nav_community") },
    { path: "/app/chat",       icon: MessageSquare, label: t("nav_chat") },
    { path: "/app/tools",      icon: Wrench,        label: t("nav_tools") },
    { path: "/app/profile",    icon: User,          label: t("nav_profile") },
  ];

  const bottomNavItems: NavItem[] = [
    { path: "/app/dashboard",  icon: Home,          label: t("nav_home") },
    { path: "/app/workouts",   icon: Dumbbell,      label: t("nav_workouts") },
    { path: "/app/steps",      icon: Activity,      label: t("nav_steps") },
    { path: "/app/community",  icon: Users,         label: t("nav_community") },
    { path: "/app/profile",    icon: User,          label: t("nav_profile") },
  ];

  const moreDrawerItems: NavItem[] = [
    { path: "/app/analytics",  icon: TrendingUp,    label: t("nav_analytics") },
    { path: "/app/coaching",   icon: UserCheck,     label: t("nav_coaching") },
    { path: "/app/blogs",      icon: FileText,      label: t("blog_title") },
    { path: "/app/chat",       icon: MessageSquare, label: t("nav_chat") },
    { path: "/app/plans",      icon: ClipboardList, label: t("nav_plans") },
    { path: "/app/tools",      icon: Wrench,        label: t("nav_tools") },
  ];

  const pointsFooter = (
    <div style={{
      padding: "12px 14px",
      backgroundColor: "var(--accent-dim)",
      border: "1px solid rgba(200,255,0,0.2)",
      borderRadius: 12,
    }}>
      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 2 }}>{t("total_points")}</p>
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
    roleLabel: user?.isPremium ? `⚡ ${t("premium_member")}` : t("free_plan"),
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
        marginInlineStart: isMobile ? 0 : sidebarW,
        transition: "margin 0.25s cubic-bezier(0.4,0,0.2,1)",
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
