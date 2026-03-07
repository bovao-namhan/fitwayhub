import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Mail, Lock, User, Activity, CheckCircle2, Dumbbell, Trophy, Chrome, Facebook, ArrowLeft } from "lucide-react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "coach">("user");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const startSocialSignup = (provider: "google" | "facebook") => {
    const base = (import.meta.env.VITE_API_BASE as string) || "";
    window.location.href = `${base}/api/auth/oauth/${provider}`;
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    // Client-side validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters long"); return; }
    setIsLoading(true);
    try {
      await register(email, password, name, role);
      if (role === "coach") {
        navigate("/coach/dashboard");
      } else {
        navigate("/app/onboarding");
      }
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  };

  const perks = ["50+ certified workout programs", "AI-powered step analysis", "Community challenges & rewards", "Free to start — no card needed"];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex" }}>
      <div className="hidden lg:flex" style={{ width: "45%", backgroundColor: "var(--bg-surface)", borderInlineEnd: "1px solid var(--border)", flexDirection: "column", justifyContent: "space-between", padding: "48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", insetInlineEnd: "-10%", width: 300, height: 300, borderRadius: "50%", backgroundColor: "var(--accent)", opacity: 0.07, filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ backgroundColor: "var(--accent)", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="#0A0A0B" />
          </div>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.04em" }}>FITWAY HUB</span>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 28 }}>
            Join 12,000+<br /><span style={{ color: "var(--accent)" }}>fit members</span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {perks.map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[{ v: "12K+", l: "Members" }, { v: "50+", l: "Programs" }, { v: "4.9★", l: "Rating" }].map((s) => (
            <div key={s.l}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{s.v}</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div className="fade-up" style={{ width: "100%", maxWidth: 420 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, padding: 0 }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ backgroundColor: "var(--accent)", width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={15} color="#0A0A0B" />
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700 }}>FITWAY HUB</span>
          </div>

          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Create account</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>Join the community and start your journey</p>

          {/* Role Selection */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>I am joining as</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                { val: "user", label: "Athlete", desc: "Train & progress", Icon: Trophy },
                { val: "coach", label: "Coach", desc: "Membership required", Icon: Dumbbell },
              ] as const).map(({ val, label, desc, Icon }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRole(val)}
                  style={{
                    padding: "14px 12px", borderRadius: 12,
                    border: `2px solid ${role === val ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: role === val ? "var(--accent-dim)" : "var(--bg-card)",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.15s",
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: role === val ? "var(--accent)" : "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    <Icon size={18} color={role === val ? "#0A0A0B" : "var(--text-muted)"} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: role === val ? "var(--accent)" : "var(--text-primary)" }}>{label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: "12px 16px", backgroundColor: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 10, color: "var(--red)", fontSize: 13, marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Full Name</label>
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" style={{ paddingInlineStart: 40 }} placeholder="John Doe" required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" style={{ paddingInlineStart: 40 }} placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input-base" style={{ paddingInlineStart: 40, paddingInlineEnd: 44, borderColor: password && password.length < 8 ? "var(--red)" : undefined }} placeholder="Min. 8 characters" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p style={{ fontSize: 11, color: "var(--red)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  ⚠ {8 - password.length} more character{8 - password.length !== 1 ? "s" : ""} needed
                </p>
              )}
              {password.length >= 8 && (
                <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>✓ Password strength is good</p>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              By creating an account, you agree to our{" "}
              <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms</a> and{" "}
              <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy Policy</a>.
            </p>
            <button type="submit" disabled={isLoading} className="btn-accent" style={{ marginTop: 4, padding: "13px", fontSize: 14 }}>
              {isLoading ? "Creating account..." : `Join as ${role === "coach" ? "Coach" : "Athlete"}`}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
            </div>

            <button
              type="button"
              className="input-base"
              onClick={() => startSocialSignup("google")}
              style={{ padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", backgroundColor: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Chrome size={16} />
              Sign up with Google
            </button>

            <button
              type="button"
              className="input-base"
              onClick={() => startSocialSignup("facebook")}
              style={{ padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", backgroundColor: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Facebook size={16} />
              Sign up with Facebook
            </button>
          </form>

          <p style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "var(--text-secondary)" }}>
            Already have an account?{" "}
            <Link to="/auth/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
