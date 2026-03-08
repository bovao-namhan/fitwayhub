import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, Activity, MessageSquare,
  Megaphone, Globe, ClipboardList, CreditCard, Lock, X, FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBranding, getBrandLogoForLang } from "@/context/BrandingContext";
import { useI18n } from "@/context/I18nContext";
import { useTheme } from "@/context/ThemeContext";
import { SharedSidebar, NavItem } from "@/components/layout/SharedSidebar";
import PaymentForm from "@/components/app/PaymentForm";

const navItems: NavItem[] = [
  { path: "/coach/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/coach/requests",  icon: ClipboardList,   label: "Requests" },
  { path: "/coach/athletes",  icon: Users,           label: "Athletes" },
  { path: "/coach/chat",      icon: MessageSquare,   label: "Messages" },
  { path: "/coach/ads",       icon: Megaphone,       label: "My Ads" },
  { path: "/coach/blogs",     icon: FileText,        label: "No Pain No Shawerma" },
  { path: "/coach/community", icon: Globe,           label: "Community" },
  { path: "/coach/profile",   icon: Activity,        label: "Profile" },
];

const bottomNavItems: NavItem[] = [
  { path: "/coach/dashboard", icon: LayoutDashboard, label: "Home" },
  { path: "/coach/requests",  icon: ClipboardList,   label: "Requests" },
  { path: "/coach/athletes",  icon: Users,           label: "Athletes" },
  { path: "/coach/chat",      icon: MessageSquare,   label: "Chat" },
  { path: "/coach/profile",   icon: Activity,        label: "Profile" },
];

const moreItems: NavItem[] = [
  { path: "/coach/ads",       icon: Megaphone, label: "My Ads" },
  { path: "/coach/community", icon: Globe,     label: "Community" },
];

// ── Membership paywall overlay ────────────────────────────────────────────────
function CoachPaywall({ onPay }: { onPay: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      backdropFilter: "blur(16px) brightness(0.4)",
      WebkitBackdropFilter: "blur(16px) brightness(0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(10,10,11,0.7)",
    }}>
      <div style={{
        backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 20, padding: "36px 40px", maxWidth: 440, width: "90%",
        textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(59,139,255,0.15)", border: "1px solid rgba(59,139,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Lock size={26} color="var(--blue)" />
        </div>
        <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Activate Your Coach Account</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 8 }}>
          Activate your coach membership to access your dashboard and start working with athletes.
        </p>
        <div style={{ background: "rgba(59,139,255,0.08)", border: "1px solid rgba(59,139,255,0.2)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "start" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--blue)", marginBottom: 8, fontFamily: "'Chakra Petch', sans-serif" }}>COACH MEMBERSHIP</p>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "var(--bg-surface)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Monthly</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700 }}>50 EGP</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>per month</p>
            </div>
            <div style={{ flex: 1, background: "var(--accent-dim)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(200,255,0,0.2)" }}>
              <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 4 }}>Annual ⚡ SAVE 25%</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>450 EGP</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>per year</p>
            </div>
          </div>
        </div>
        <button onClick={onPay} style={{ width: "100%", padding: "14px", borderRadius: 12, background: "var(--blue)", border: "none", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <CreditCard size={17} /> Choose Payment Method
        </button>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 14, lineHeight: 1.6 }}>
          💳 <strong>PayPal / Card</strong> = instant activation &nbsp;·&nbsp; 📱 <strong>E-Wallet</strong> = pending admin review
        </p>
      </div>
    </div>
  );
}

// ── Membership payment modal ──────────────────────────────────────────────────
function CoachPaymentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "annual">("monthly");
  const amount = plan === "annual" ? 450 : 50;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700 }}>Coach Membership</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
        </div>

        {/* Plan picker */}
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {(["monthly", "annual"] as const).map(p => (
            <button key={p} onClick={() => setPlan(p)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${plan === p ? "var(--blue)" : "var(--border)"}`, background: plan === p ? "rgba(59,139,255,0.1)" : "var(--bg-surface)", cursor: "pointer", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4, textTransform: "capitalize" }}>{p}</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: plan === p ? "var(--blue)" : "var(--text-primary)" }}>
                {p === "annual" ? "450" : "50"} EGP
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{p === "annual" ? "/year" : "/month"}</p>
              {p === "annual" && <p style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, marginTop: 4 }}>SAVE 25%</p>}
            </button>
          ))}
        </div>

        <div style={{ padding: "10px 14px", backgroundColor: "rgba(255,179,64,0.07)", border: "1px solid rgba(255,179,64,0.2)", borderRadius: 10, marginBottom: 18, fontSize: 12, color: "var(--amber)" }}>
          ⚡ <strong>PayPal</strong> = instant activation &nbsp;|&nbsp; 📱 <strong>E-Wallet</strong> = admin must approve before you get access
        </div>

        <PaymentForm
          amount={amount}
          plan={plan}
          type="coach"
          token={token}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
          onError={(msg) => console.error("Payment error:", msg)}
        />
      </div>
    </div>
  );
}

// ── CoachLayout ───────────────────────────────────────────────────────────────
export function CoachLayout() {
  const { user, refreshUser } = useAuth();
  const { branding } = useBranding();
  const { lang, t } = useI18n();
  const { isDark } = useTheme();
  const isRtl = lang === "ar";
  const brandLogo = getBrandLogoForLang(branding, lang, isDark);
  const [showPayment, setShowPayment] = useState(false);
  const membershipActive = user?.coachMembershipActive || user?.role === "admin";

  const activateBtn = !membershipActive ? (
    <button
      onClick={() => setShowPayment(true)}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--blue)", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
    >
      <CreditCard size={13} /> Activate Account
    </button>
  ) : null;

  const translatedNavItems: NavItem[] = [
    { path: "/coach/dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { path: "/coach/requests",  icon: ClipboardList,   label: t("requests") },
    { path: "/coach/athletes",  icon: Users,           label: t("athletes") },
    { path: "/coach/chat",      icon: MessageSquare,   label: t("messages") },
    { path: "/coach/ads",       icon: Megaphone,       label: t("my_ads") },
    { path: "/coach/blogs",     icon: FileText,        label: "No Pain No Shawerma" },
    { path: "/coach/community", icon: Globe,           label: t("community") },
    { path: "/coach/profile",   icon: Activity,        label: t("profile") },
  ];

  const translatedBottomNavItems: NavItem[] = [
    { path: "/coach/dashboard", icon: LayoutDashboard, label: t("nav_home") },
    { path: "/coach/requests",  icon: ClipboardList,   label: t("requests") },
    { path: "/coach/athletes",  icon: Users,           label: t("athletes") },
    { path: "/coach/chat",      icon: MessageSquare,   label: t("nav_chat") },
    { path: "/coach/profile",   icon: Activity,        label: t("nav_profile") },
  ];

  const translatedMoreItems: NavItem[] = [
    { path: "/coach/ads",       icon: Megaphone, label: t("my_ads") },
    { path: "/coach/blogs",     icon: FileText,  label: "No Pain No Shawerma" },
    { path: "/coach/community", icon: Globe,     label: t("community") },
  ];

  const { isMobile, sidebarW, DesktopSidebar, OverlayDrawer, MobileTopBar, MobileBottomBar } = SharedSidebar({
    navItems: translatedNavItems,
    bottomNavItems: translatedBottomNavItems,
    moreDrawerItems: translatedMoreItems,
    accentColor: "var(--blue)",
    accentBg: "rgba(59,139,255,0.12)",
    logoIcon: Activity,
    logoIconColor: "var(--blue)",
    logoLabel: (branding.app_name || "FITWAY") + " COACH",
    logoUrl: brandLogo || undefined,
    roleLabel: membershipActive ? "🏅 Active Coach" : "⚠️ Inactive",
    roleLabelColor: membershipActive ? "var(--blue)" : "var(--amber)",
    extraFooter: activateBtn,
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", display: "flex" }}>
      {/* Paywall for unpaid coaches */}
      {!membershipActive && !showPayment && <CoachPaywall onPay={() => setShowPayment(true)} />}

      {/* Payment modal */}
      {showPayment && (
        <CoachPaymentModal
          onClose={() => setShowPayment(false)}
          onSuccess={async () => { await refreshUser(); }}
        />
      )}

      {/* Sidebar (desktop) + overlay drawer (all sizes) */}
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
