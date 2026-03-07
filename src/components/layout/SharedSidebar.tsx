import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Sun, Moon, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useI18n } from "@/context/I18nContext";

export interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

interface SharedSidebarProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  accentColor: string;
  accentBg: string;
  logoIcon: React.ElementType;
  logoIconColor: string;
  logoLabel: string;
  logoUrl?: string;
  roleLabel: string;
  roleLabelColor: string;
  extraFooter?: React.ReactNode;
  moreDrawerItems?: NavItem[];
}

const EXPANDED = 224;
const COLLAPSED = 64;

export function SharedSidebar({
  navItems, bottomNavItems, accentColor, accentBg, logoIcon: LogoIcon, logoIconColor,
  logoLabel, logoUrl, roleLabel, roleLabelColor, extraFooter, moreDrawerItems,
}: SharedSidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, lang } = useI18n();
  const isRtl = lang === "ar";

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop only: collapse to icon rail
  const [drawerOpen, setDrawerOpen] = useState(false); // overlay drawer — works on ALL screen sizes
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close overlays on route change
  useEffect(() => {
    setDrawerOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const sidebarW = sidebarCollapsed ? COLLAPSED : EXPANDED;

  // ── Shared NavLink (used in both sidebar and drawer) ─────────────────────────
  const NavLink = ({
    item,
    onClick,
    showLabel = true,
  }: {
    item: NavItem;
    onClick?: () => void;
    showLabel?: boolean;
    key?: string;
  }) => {
    const active = isActive(item.path);
    return (
      <Link
        to={item.path}
        onClick={onClick}
        title={!showLabel ? item.label : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: showLabel ? 10 : 0,
          justifyContent: showLabel ? "flex-start" : "center",
          padding: showLabel ? "9px 10px" : "10px 0",
          borderRadius: 10,
          marginBottom: 2,
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          textDecoration: "none",
          backgroundColor: active ? accentBg : "transparent",
          color: active ? accentColor : "var(--text-secondary)",
          borderInlineStart: showLabel ? `2px solid ${active ? accentColor : "transparent"}` : "none",
          transition: "all 0.15s",
          whiteSpace: "nowrap",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <item.icon size={16} strokeWidth={active ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
        {showLabel && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
        {item.badge ? (
          <span
            style={{
              marginInlineStart: showLabel ? "auto" : undefined,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: accentColor,
              color: "#0A0A0B",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  // ── User pill shared ────────────────────────────────────────────────────────
  const UserPill = ({ compact = false }: { compact?: boolean }) =>
    user ? (
      <div style={{ padding: compact ? "10px 10px 6px" : "12px 14px 8px" }}>
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: compact ? "8px 10px" : "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <img
            src={user.avatar}
            alt={user.name}
            style={{
              width: compact ? 30 : 34,
              height: compact ? 30 : 34,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name}
            </p>
            <p style={{ fontSize: 11, color: roleLabelColor, marginTop: 1 }}>{roleLabel}</p>
          </div>
        </div>
      </div>
    ) : null;

  // ── Footer actions ─────────────────────────────────────────────────────────
  const FooterActions = ({ showLabels = true }: { showLabels?: boolean }) => (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: showLabels ? "8px 10px 16px" : "8px 8px 14px",
        flexShrink: 0,
      }}
    >
      {extraFooter && showLabels && (
        <div style={{ marginBottom: 10 }}>{extraFooter}</div>
      )}
      <button
        onClick={toggleTheme}
        style={{
          display: "flex",
          alignItems: "center",
          gap: showLabels ? 8 : 0,
          justifyContent: showLabels ? "flex-start" : "center",
          width: "100%",
          padding: showLabels ? "8px 10px" : "8px 0",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--text-muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          marginBottom: 2,
          whiteSpace: "nowrap",
        }}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
        {showLabels && (isDark ? t("dark_mode") : t("light_mode"))}
      </button>
      <button
        onClick={logout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: showLabels ? 10 : 0,
          justifyContent: showLabels ? "flex-start" : "center",
          width: "100%",
          padding: showLabels ? "9px 10px" : "9px 0",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          color: "var(--red)",
          background: "none",
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <LogOut size={16} style={{ flexShrink: 0 }} />
        {showLabels && t("sign_out")}
      </button>
    </div>
  );

  // ── Desktop Sidebar (persistent, collapsible to icon rail) ────────────────
  const DesktopSidebar = () => (
    <aside
      style={{
        position: "fixed",
        top: 0,
        insetInlineStart: 0,
        bottom: 0,
        width: sidebarW,
        zIndex: 40,
        backgroundColor: "var(--bg-surface)",
        borderInlineEnd: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}
    >
      {/* Header: logo + collapse toggle */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden", flex: 1 }}>
          {!sidebarCollapsed && (
            <img src={logoUrl || "/logo.svg"} alt={logoLabel} style={{ height: 30, borderRadius: 6, objectFit: 'contain', flexShrink: 0 }} />
          )}
        </div>

        {/* Collapse/expand toggle */}
        <button
          onClick={() => setSidebarCollapsed((c) => !c)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            color: "var(--text-muted)",
            flexShrink: 0,
          }}
        >
          {sidebarCollapsed ? (isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />) : (isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)}
        </button>
      </div>

      {/* User pill — only when expanded */}
      {!sidebarCollapsed && <UserPill />}

      {/* Nav items */}
      <nav
        style={{ flex: 1, padding: "4px 8px", overflowY: "auto", overflowX: "hidden" }}
      >
        {!sidebarCollapsed && (
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              padding: "6px 8px 8px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {t("navigation")}
          </p>
        )}
        {navItems.map((item) => (
          <NavLink key={item.path} item={item} showLabel={!sidebarCollapsed} />
        ))}
      </nav>

      <FooterActions showLabels={!sidebarCollapsed} />
    </aside>
  );

  // ── Overlay Drawer — slides from logical side (left LTR / right RTL) ─────
  const OverlayDrawer = () => (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          insetInlineStart: 0,
          bottom: 0,
          width: 270,
          zIndex: 60,
          backgroundColor: "var(--bg-surface)",
          borderInlineEnd: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : (isRtl ? "translateX(100%)" : "translateX(-100%)"),
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: drawerOpen ? (isRtl ? "-4px 0 32px rgba(0,0,0,0.45)" : "4px 0 32px rgba(0,0,0,0.45)") : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoUrl || "/logo.svg"} alt={logoLabel} style={{ height: 30, borderRadius: 6, objectFit: 'contain' }} />
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--text-secondary)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <UserPill />

        {/* Full nav */}
        <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              padding: "6px 8px 8px",
              textTransform: "uppercase",
            }}
          >
            {t("navigation")}
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              item={item}
              showLabel
              onClick={() => setDrawerOpen(false)}
            />
          ))}
        </nav>

        <FooterActions showLabels />
      </aside>
    </>
  );

  // ── Mobile Top Bar ─────────────────────────────────────────────────────────
  // Only rendered on mobile — desktop uses the persistent sidebar header
  const MobileTopBar = () => (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 56,
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Hamburger always visible */}
        <button
          onClick={() => setDrawerOpen((o) => !o)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: drawerOpen ? accentBg : "var(--bg-card)",
            border: `1px solid ${drawerOpen ? accentColor : "var(--border)"}`,
            cursor: "pointer",
            color: drawerOpen ? accentColor : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          {drawerOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <img src={logoUrl || "/logo.svg"} alt={logoLabel} style={{ height: 28, borderRadius: 6, objectFit: 'contain' }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={toggleTheme}
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            color: "var(--text-secondary)",
          }}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {user?.avatar && (
          <img
            src={user.avatar}
            alt={user.name}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `2px solid ${accentColor}`,
              objectFit: "cover",
            }}
          />
        )}
      </div>
    </header>
  );

  // ── Mobile Bottom Tab Bar ──────────────────────────────────────────────────
  const bottomItems = bottomNavItems || navItems.slice(0, 5);
  const hasMoreItems = moreDrawerItems && moreDrawerItems.length > 0;

  const MobileBottomBar = () => (
    <>
      {/* More items sheet */}
      {hasMoreItems && (
        <>
          {moreOpen && (
            <div
              onClick={() => setMoreOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 55,
                backgroundColor: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(2px)",
              }}
            />
          )}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 65,
              backgroundColor: "var(--bg-surface)",
              borderTop: "1px solid var(--border)",
              borderRadius: "20px 20px 0 0",
              paddingBottom: "calc(60px + env(safe-area-inset-bottom))",
              transform: moreOpen ? "translateY(0)" : "translateY(100%)",
              transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "var(--border)",
                }}
              />
            </div>
            <div style={{ padding: "4px 14px" }}>
              {moreDrawerItems!.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 12px",
                      borderRadius: 12,
                      marginBottom: 2,
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                      textDecoration: "none",
                      backgroundColor: active ? accentBg : "transparent",
                      color: active ? accentColor : "var(--text-primary)",
                      transition: "all 0.15s",
                    }}
                  >
                    <item.icon size={18} strokeWidth={active ? 2.5 : 1.75} />
                    {item.label}
                    <ChevronRight
                      size={14}
                      style={{ marginInlineStart: "auto", color: "var(--text-muted)", transform: isRtl ? "rotate(180deg)" : "none" }}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: "calc(60px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
          backgroundColor: "var(--bg-surface)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          backdropFilter: "blur(16px)",
        }}
      >
        {bottomItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                paddingTop: 8,
                paddingBottom: 4,
                textDecoration: "none",
                color: active ? accentColor : "var(--text-muted)",
                transition: "color 0.15s",
                minHeight: 52,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  backgroundColor: active ? accentBg : "transparent",
                  transition: "background 0.15s",
                  position: "relative",
                }}
              >
                <item.icon size={19} strokeWidth={active ? 2.5 : 1.75} />
                {item.badge ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      insetInlineEnd: 2,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      backgroundColor: accentColor,
                      color: "#0A0A0B",
                      fontSize: 9,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 400,
                  fontFamily: active ? "'Chakra Petch', sans-serif" : "inherit",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
        {hasMoreItems && (
          <button
            onClick={() => setMoreOpen((o) => !o)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingTop: 8,
              paddingBottom: 4,
              color: moreOpen ? accentColor : "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              minHeight: 52,
            }}
          >
            <div
              style={{
                width: 40,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor: moreOpen ? accentBg : "transparent",
              }}
            >
              {moreOpen ? (
                <X size={19} strokeWidth={2.5} />
              ) : (
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        backgroundColor: "currentColor",
                        display: "block",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: moreOpen ? 700 : 400,
                fontFamily: moreOpen ? "'Chakra Petch', sans-serif" : "inherit",
              }}
            >
              {t("more")}
            </span>
          </button>
        )}
      </nav>
    </>
  );

  return {
    isMobile,
    sidebarW,
    DesktopSidebar,
    OverlayDrawer,   // used on ALL screen sizes
    MobileTopBar,    // only render on mobile
    MobileBottomBar, // only render on mobile
  };
}
