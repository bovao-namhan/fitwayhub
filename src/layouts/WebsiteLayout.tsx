import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Activity, Instagram, Facebook, Twitter, Youtube, Sun, Moon, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useBranding, getBrandLogoForLang } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

export function WebsiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { branding } = useBranding();
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const displayName = user?.name || user?.email?.split("@")[0] || "there";
  const brandLogo = getBrandLogoForLang(branding, lang);

  const appRoute = user?.role === "admin"
    ? "/admin/dashboard"
    : user?.role === "coach"
      ? "/coach/dashboard"
      : "/app/dashboard";

  const navLinks: Array<{name:string;path:string}> = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  // Dynamic header BG based on theme
  const headerBg = isDark ? "rgba(10,10,11,0.88)" : "rgba(248,248,250,0.92)";

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>

      {/* ── Header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        backgroundColor: headerBg,
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
        transition: "background-color 0.2s",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 64 }}>
          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            {brandLogo ? (
              <img src={brandLogo} alt="" style={{ width: 30, height: 30, borderRadius: 7, objectFit: "contain" }} />
            ) : (
              <div style={{ backgroundColor: "var(--accent)", width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={16} color="#0A0A0B" />
              </div>
            )}
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)" }}>{branding.app_name || "FITWAY HUB"}</span>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
          <nav style={{ alignItems: "center", gap: 6, display: "flex" }}>
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500,
                textDecoration: "none",
                color: location.pathname === link.path ? "var(--accent)" : "var(--text-secondary)",
                backgroundColor: location.pathname === link.path ? "var(--accent-dim)" : "transparent",
                transition: "all 0.15s",
              }}>
                {link.name}
              </Link>
            ))}
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                marginLeft: 4, width: 36, height: 36, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                cursor: "pointer", color: "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4, padding: 3, borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-card)" }}>
              <button
                onClick={() => setLang("en")}
                title="English"
                style={{
                  minWidth: 34,
                  height: 30,
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  background: lang === "en" ? "var(--accent)" : "transparent",
                  color: lang === "en" ? "#0A0A0B" : "var(--text-secondary)",
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLang("ar")}
                title="العربية"
                style={{
                  minWidth: 34,
                  height: 30,
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  background: lang === "ar" ? "var(--accent)" : "transparent",
                  color: lang === "ar" ? "#0A0A0B" : "var(--text-secondary)",
                }}
              >
                AR
              </button>
            </div>
            {user ? (
              <div ref={accountRef} style={{ position: "relative", marginLeft: 6 }}>
                <button
                  onClick={() => setAccountOpen(v => !v)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                    alt=""
                    style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                  />
                  {`Hello ${displayName}`}
                  <ChevronDown size={14} style={{ opacity: 0.7 }} />
                </button>

                {accountOpen && (
                  <div style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    minWidth: 180,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    boxShadow: "0 10px 28px var(--shadow)",
                    overflow: "hidden",
                    zIndex: 80,
                  }}>
                    <button
                      onClick={() => { setAccountOpen(false); navigate(appRoute); }}
                      style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}
                    >
                      {t("go_to_app")}
                    </button>
                    <button
                      onClick={() => { setAccountOpen(false); logout(); navigate("/"); }}
                      style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 13 }}
                    >
                      {t("sign_out")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth/login" style={{
                marginLeft: 6, padding: "8px 20px", borderRadius: 9, fontSize: 14, fontWeight: 700,
                textDecoration: "none", backgroundColor: "var(--accent)", color: "#0A0A0B",
                fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.02em",
                transition: "opacity 0.15s",
              }}>
                Get Started
              </Link>
            )}
          </nav>
          )}

          {/* Tablet/Mobile — hamburger button */}
          {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3, padding: 2, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)" }}>
              <button
                onClick={() => setLang("en")}
                title="English"
                style={{
                  minWidth: 30,
                  height: 30,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 700,
                  background: lang === "en" ? "var(--accent)" : "transparent",
                  color: lang === "en" ? "#0A0A0B" : "var(--text-secondary)",
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLang("ar")}
                title="العربية"
                style={{
                  minWidth: 30,
                  height: 30,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                  fontWeight: 700,
                  background: lang === "ar" ? "var(--accent)" : "transparent",
                  color: lang === "ar" ? "#0A0A0B" : "var(--text-secondary)",
                }}
              >
                AR
              </button>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                width: 36, height: 36, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                cursor: "pointer", color: "var(--text-secondary)",
              }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: 40, height: 40, borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: menuOpen ? "var(--accent-dim)" : "var(--bg-card)",
                border: `1px solid ${menuOpen ? "var(--accent)" : "var(--border)"}`,
                cursor: "pointer", color: menuOpen ? "var(--accent)" : "var(--text-primary)",
                transition: "all 0.15s",
              }}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          )}
        </div>

        {/* Mobile/Tablet dropdown menu */}
        {menuOpen && (
          <div style={{
            borderTop: "1px solid var(--border)",
            backgroundColor: "var(--bg-surface)",
            padding: "12px 16px 20px",
            display: "flex", flexDirection: "column", gap: 4,
            boxShadow: "0 8px 32px var(--shadow)",
          }}>
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}
                style={{
                  padding: "12px 16px", borderRadius: 10, fontSize: 15, fontWeight: 500,
                  textDecoration: "none",
                  color: location.pathname === link.path ? "var(--accent)" : "var(--text-primary)",
                  backgroundColor: location.pathname === link.path ? "var(--accent-dim)" : "transparent",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.15s",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <div style={{ height: 1, backgroundColor: "var(--border)", margin: "8px 0" }} />
            {user ? (
              <>
                <Link to={appRoute}
                  style={{
                    padding: "13px 16px", borderRadius: 10, textAlign: "center",
                    fontSize: 15, fontWeight: 700, textDecoration: "none",
                    backgroundColor: "var(--accent)", color: "#0A0A0B",
                    fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.02em",
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  {t("go_to_app")} →
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); logout(); navigate("/"); }}
                  style={{
                    padding: "11px 16px",
                    borderRadius: 10,
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    border: "1px solid rgba(255,68,68,0.25)",
                    backgroundColor: "rgba(255,68,68,0.08)",
                    color: "var(--red)",
                    fontFamily: "'Chakra Petch', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  {t("sign_out")}
                </button>
              </>
            ) : (
              <Link to="/auth/login"
                style={{
                  padding: "13px 16px", borderRadius: 10, textAlign: "center",
                  fontSize: 15, fontWeight: 700, textDecoration: "none",
                  backgroundColor: "var(--accent)", color: "#0A0A0B",
                  fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.02em",
                }}
                onClick={() => setMenuOpen(false)}
              >
                {t("get_started")} →
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-surface)", padding: "48px 24px 32px", transition: "background-color 0.2s" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40 }} className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              {brandLogo ? (
                <img src={brandLogo} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "contain" }} />
              ) : (
                <div style={{ backgroundColor: "var(--accent)", width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Activity size={14} color="#0A0A0B" />
                </div>
              )}
              <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>{branding.app_name || "FITWAY HUB"}</span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 260 }}>{branding.footer_text || "Egypt's #1 digital fitness ecosystem."}</p>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {[
                { Icon: Instagram, url: branding.social_instagram },
                { Icon: Facebook, url: branding.social_facebook },
                { Icon: Twitter, url: branding.social_twitter },
                { Icon: Youtube, url: branding.social_youtube },
              ].filter(s => s.url).map(({ Icon, url }, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)", transition: "color 0.15s" }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "var(--accent)")}
                  onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Product</p>
            {[{ name: "Home", path: "/" }, { name: "About", path: "/about" }, { name: "Contact", path: "/contact" }].map(l => (
              <Link key={l.path} to={l.path} style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 10 }}>{l.name}</Link>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Legal</p>
            {["Privacy Policy", "Terms of Service"].map((l) => (
              <a key={l} href="#" style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 10 }}>{l}</a>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>Get the App</p>
            {["App Store", "Google Play"].map((l) => (
              <a key={l} href="#" style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 10 }}>{l}</a>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "32px auto 0", paddingTop: 24, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{branding.copyright_text || `© ${new Date().getFullYear()} Fitway Hub. All rights reserved.`}</p>
        </div>
      </footer>
    </div>
  );
}
