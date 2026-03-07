import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Mail, Lock, Activity, ArrowLeft } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const coachMembershipRequired = searchParams.get("coach_membership") === "required";
  const navigate = useNavigate();

  const appRoute = user?.role === "admin"
    ? "/admin/dashboard"
    : user?.role === "coach"
      ? "/coach/dashboard"
      : "/app/dashboard";

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  const startSocialLogin = (provider: "google" | "facebook") => {
    const base = (import.meta.env.VITE_API_BASE as string) || "";
    window.location.href = `${base}/api/auth/oauth/${provider}`;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const data = await login(email, password, rememberMe);
      if (data?.rememberToken) localStorage.setItem("remember_token", data.rememberToken);
      // Redirect based on role
      const role = data?.user?.role || "user";
      if (role === "admin") navigate("/admin/dashboard");
      else if (role === "coach") navigate("/coach/dashboard");
      else navigate("/app/dashboard");
    } catch (err: any) {
      if (err.message?.includes('COACH_MEMBERSHIP_REQUIRED') || err.message?.includes('membership required') || err.message?.includes('membership')) {
        setError("Coach membership payment required. Contact admin at support@fitwayhub.com");
      } else {
        setError(err.message || "Failed to login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!loading && user) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 460, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 28 }}>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 10 }}>You are already logged in</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 22 }}>
            Signed in as <strong>{user.email}</strong>. Continue to your account.
          </p>
          <button
            type="button"
            className="btn-accent"
            style={{ width: "100%", padding: "12px 14px", fontSize: 14 }}
            onClick={() => navigate(appRoute)}
          >
            Open My Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex" }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex"
        style={{
          width: "45%",
          backgroundColor: "var(--bg-surface)",
          borderInlineEnd: "1px solid var(--border)",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: "absolute",
          bottom: "15%",
          insetInlineStart: "10%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          backgroundColor: "var(--accent)",
          opacity: 0.08,
          filter: "blur(80px)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ backgroundColor: "var(--accent)", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="#0A0A0B" />
          </div>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.04em" }}>FITWAY HUB</span>
        </div>

        {/* Quote block */}
        <div>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1.2, color: "var(--text-primary)", marginBottom: 20 }}>
            Transform your body.<br />
            <span style={{ color: "var(--accent)" }}>Empower your mind.</span>
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 340 }}>
            Egypt's #1 digital fitness ecosystem. Certified programs, smart tracking, and a community that keeps you accountable.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 32 }}>
          {[{ v: "12K+", l: "Members" }, { v: "50+", l: "Programs" }, { v: "4.9★", l: "Rating" }].map((s) => (
            <div key={s.l}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{s.v}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div className="fade-up" style={{ width: "100%", maxWidth: 400 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, padding: 0 }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ backgroundColor: "var(--accent)", width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={15} color="#0A0A0B" />
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700 }}>FITWAY HUB</span>
          </div>

          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 32 }}>Sign in to continue your journey</p>

          {coachMembershipRequired && (
            <div style={{ padding: "14px 16px", backgroundColor: "rgba(255,179,64,0.1)", border: "1px solid rgba(255,179,64,0.3)", borderRadius: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--amber)", marginBottom: 4 }}>🔒 Coach Membership Required</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Coach accounts require an active paid membership to log in. Please contact admin or complete your membership payment.</p>
            </div>
          )}
          {error && (
            <div style={{ padding: "12px 16px", backgroundColor: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 10, color: "var(--red)", fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  style={{ paddingInlineStart: 40 }}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  style={{ paddingInlineStart: 40, paddingInlineEnd: 44 }}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: "var(--accent)", width: 15, height: 15 }}
                />
                Remember me
              </label>
              <Link to="#" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Forgot password?</Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-accent"
              style={{ marginTop: 4, padding: "13px", fontSize: 14 }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
            </div>

            <button
              type="button"
              className="input-base"
              onClick={() => startSocialLogin("google")}
              style={{ padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", backgroundColor: "var(--bg-card)" }}
            >
              Continue with Google
            </button>

            <button
              type="button"
              className="input-base"
              onClick={() => startSocialLogin("facebook")}
              style={{ padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", backgroundColor: "var(--bg-card)" }}
            >
              Continue with Facebook
            </button>
          </form>

          <p style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "var(--text-secondary)" }}>
            Don't have an account?{" "}
            <Link to="/auth/register" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
