import { Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, Settings, Activity,
  Gift, DollarSign, Video, Megaphone, UserCheck, Globe, MessageCircle, FileText,
  ClipboardList, Wallet, Mail, Bell,
} from "lucide-react";
import { useBranding, getBrandLogoForLang } from "@/context/BrandingContext";
import { useI18n } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { SharedSidebar, NavItem } from "@/components/layout/SharedSidebar";

const navItems: NavItem[] = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/users",     icon: Users,           label: "Users" },
  { path: "/admin/coaches",   icon: UserCheck,       label: "Coaches" },
  { path: "/admin/payments",  icon: DollarSign,      label: "Payments" },
  { path: "/admin/videos",    icon: Video,           label: "Videos" },
  { path: "/admin/ads",       icon: Megaphone,       label: "Coach Ads" },
  { path: "/admin/chat",      icon: MessageCircle,   label: "Chat" },
  { path: "/admin/gifts",     icon: Gift,            label: "Gifts" },
  { path: "/admin/blogs",          icon: FileText,        label: "No Pain No Shawerma" },
  { path: "/admin/website",        icon: Globe,           label: "Website" },
  { path: "/admin/subscriptions",  icon: ClipboardList,   label: "Subscriptions" },
  { path: "/admin/withdrawals",    icon: Wallet,          label: "Withdrawals" },
  { path: "/admin/email",          icon: Mail,            label: "Email Server" },
  { path: "/admin/notifications",  icon: Bell,            label: "Notifications" },
  { path: "/admin/settings",       icon: Settings,        label: "Settings" },
];

const bottomNavItems: NavItem[] = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Overview" },
  { path: "/admin/users",     icon: Users,           label: "Users" },
  { path: "/admin/payments",  icon: DollarSign,      label: "Payments" },
  { path: "/admin/coaches",   icon: UserCheck,       label: "Coaches" },
  { path: "/admin/settings",  icon: Settings,        label: "Settings" },
];

const moreItems: NavItem[] = [
  { path: "/admin/videos",  icon: Video,     label: "Videos" },
  { path: "/admin/ads",     icon: Megaphone, label: "Coach Ads" },
  { path: "/admin/chat",           icon: MessageCircle, label: "Chat" },
  { path: "/admin/gifts",          icon: Gift,          label: "Gifts" },
  { path: "/admin/website",        icon: Globe,         label: "Website" },
  { path: "/admin/subscriptions",  icon: ClipboardList, label: "Subscriptions" },
  { path: "/admin/withdrawals",    icon: Wallet,        label: "Withdrawals" },
  { path: "/admin/email",          icon: Mail,          label: "Email Server" },
  { path: "/admin/notifications",  icon: Bell,          label: "Notifications" },
];

export function AdminLayout() {
  const { branding } = useBranding();
  const { lang, t } = useI18n();
  const { isDark } = useTheme();
  const isRtl = lang === "ar";
  const brandLogo = getBrandLogoForLang(branding, lang, isDark);
  const translatedNavItems: NavItem[] = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { path: "/admin/users",     icon: Users,           label: t("users") },
    { path: "/admin/coaches",   icon: UserCheck,       label: t("coaches") },
    { path: "/admin/payments",  icon: DollarSign,      label: t("payments") },
    { path: "/admin/videos",    icon: Video,           label: t("videos") },
    { path: "/admin/ads",       icon: Megaphone,       label: t("coach_ads") },
    { path: "/admin/chat",      icon: MessageCircle,   label: t("chat") },
    { path: "/admin/gifts",     icon: Gift,            label: t("gifts") },
    { path: "/admin/blogs",          icon: FileText,        label: "No Pain No Shawerma" },
    { path: "/admin/website",        icon: Globe,           label: t("website") },
    { path: "/admin/subscriptions",  icon: ClipboardList,   label: t("subscriptions") || "Subscriptions" },
    { path: "/admin/withdrawals",    icon: Wallet,          label: t("withdrawals") || "Withdrawals" },
    { path: "/admin/email",          icon: Mail,            label: "Email Server" },
    { path: "/admin/notifications",  icon: Bell,            label: "Notifications" },
    { path: "/admin/settings",       icon: Settings,        label: t("settings") },
  ];

  const translatedBottomNavItems: NavItem[] = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: t("overview") },
    { path: "/admin/users",     icon: Users,           label: t("users") },
    { path: "/admin/payments",  icon: DollarSign,      label: t("payments") },
    { path: "/admin/coaches",   icon: UserCheck,       label: t("coaches") },
    { path: "/admin/settings",  icon: Settings,        label: t("settings") },
  ];

  const translatedMoreItems: NavItem[] = [
    { path: "/admin/videos",  icon: Video,          label: t("videos") },
    { path: "/admin/ads",     icon: Megaphone,      label: t("coach_ads") },
    { path: "/admin/chat",           icon: MessageCircle,  label: t("chat") },
    { path: "/admin/gifts",          icon: Gift,           label: t("gifts") },
    { path: "/admin/blogs",          icon: FileText,       label: "No Pain No Shawerma" },
    { path: "/admin/website",        icon: Globe,          label: t("website") },
    { path: "/admin/subscriptions",  icon: ClipboardList,  label: t("subscriptions") || "Subscriptions" },
    { path: "/admin/withdrawals",    icon: Wallet,         label: t("withdrawals") || "Withdrawals" },
    { path: "/admin/email",          icon: Mail,           label: "Email Server" },
    { path: "/admin/notifications",  icon: Bell,           label: "Notifications" },
  ];
  const { isMobile, sidebarW, DesktopSidebar, OverlayDrawer, MobileTopBar, MobileBottomBar } = SharedSidebar({
    navItems: translatedNavItems,
    bottomNavItems: translatedBottomNavItems,
    moreDrawerItems: translatedMoreItems,
    accentColor: "var(--red)",
    accentBg: "rgba(255,68,68,0.12)",
    logoIcon: Activity,
    logoIconColor: "var(--red)",
    logoLabel: "",
    logoUrl: brandLogo || undefined,
    roleLabel: "🛡️ Admin",
    roleLabelColor: "var(--red)",
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", display: "flex" }}>
      {!isMobile && <DesktopSidebar />}
      <OverlayDrawer />
      {isMobile && <MobileTopBar />}

      <main style={{
        flex: 1,
        minWidth: 0,
        overflowX: "hidden",
        marginInlineStart: isMobile ? 0 : sidebarW,
        transition: "margin 0.25s cubic-bezier(0.4,0,0.2,1)",
        paddingTop: isMobile ? 60 : 0,
        paddingBottom: isMobile ? "calc(68px + env(safe-area-inset-bottom))" : 0,
      }}>
        <div style={{ padding: isMobile ? "16px 12px" : "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>

      {isMobile && <MobileBottomBar />}
    </div>
  );
}
