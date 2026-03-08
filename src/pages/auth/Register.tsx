import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Eye, EyeOff, Mail, Lock, User, Activity, CheckCircle2, Dumbbell, Trophy, Chrome, ArrowLeft, ShieldQuestion } from "lucide-react";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite childhood movie?",
  "What was the make of your first car?",
];

export default function Register() {
  const { t, lang } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [role, setRole] = useState<"user" | "coach">("user");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const startSocialSignup = (provider: "google") => {
    const base = (import.meta.env.VITE_API_BASE as string) || "";
    window.location.href = `${base}/api/auth/oauth/${provider}`;
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    // Client-side validation
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) { setError(t("valid_email")); return; }
    if (password.length < 8) { setError(t("password_min")); return; }
    if (!securityQuestion) { setError(t("security_question_pick")); return; }
    if (!securityAnswer.trim()) { setError(t("security_answer_placeholder")); return; }
    setIsLoading(true);
    try {
      await register(email, password, name, role, securityQuestion, securityAnswer);
      if (role === "coach") {
        navigate("/coach/dashboard");
      } else {
        navigate("/app/onboarding");
      }
    } catch (err: any) {
      setError(err.message || t("failed_register"));
    } finally {
      setIsLoading(false);
    }
  };

  const perks = [t("perk_programs"), t("perk_steps"), t("perk_community"), t("perk_free_start")];
  const securityQuestionLabels: Record<string, string> = {
    "What was the name of your first pet?": t("security_question_1"),
    "What city were you born in?": t("security_question_2"),
    "What is your mother's maiden name?": t("security_question_3"),
    "What was the name of your first school?": t("security_question_4"),
    "What is your favorite childhood movie?": t("security_question_5"),
    "What was the make of your first car?": t("security_question_6"),
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex" }}>
      <div className="hidden lg:flex" style={{ width: "45%", backgroundColor: "var(--bg-surface)", borderInlineEnd: "1px solid var(--border)", flexDirection: "column", justifyContent: "space-between", padding: "48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", insetInlineEnd: "-10%", width: 300, height: 300, borderRadius: "50%", backgroundColor: "var(--accent)", opacity: 0.07, filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ backgroundColor: "var(--accent)", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="#0A0A0B" />
          </div>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.04em" }}>{t("fitway_hub")}</span>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 28 }}>
            {t("join_members_prefix")}<br /><span style={{ color: "var(--accent)" }}>{t("join_members_highlight")}</span>
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
          {[{ v: "12K+", l: t("members") }, { v: "50+", l: t("programs") }, { v: "4.9★", l: t("rating") }].map((s) => (
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
            <ArrowLeft size={14} /> {t("back")}
          </button>

          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ backgroundColor: "var(--accent)", width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={15} color="#0A0A0B" />
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700 }}>{t("fitway_hub")}</span>
          </div>

          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{t("create_account")}</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 }}>{t("join_community_start")}</p>

          {/* Role Selection */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>{t("joining_as")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                { val: "user", label: t("athlete"), desc: t("train_progress"), Icon: Trophy },
                { val: "coach", label: t("coach"), desc: t("membership_required"), Icon: Dumbbell },
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
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("full_name")}</label>
              <div style={{ position: "relative" }}>
                <User size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" style={{ paddingInlineStart: 40 }} placeholder={lang === "ar" ? "اسمك بالكامل" : "John Doe"} required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("email_label")}</label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" style={{ paddingInlineStart: 40 }} placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("password_label")}</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input-base" style={{ paddingInlineStart: 40, paddingInlineEnd: 44, borderColor: password && password.length < 8 ? "var(--red)" : undefined }} placeholder={t("min_chars")} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <p style={{ fontSize: 11, color: "var(--red)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  ⚠ {8 - password.length} {lang === "ar" ? "حرف كمان مطلوب" : t("chars_needed")}
                </p>
              )}
              {password.length >= 8 && (
                <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 4 }}>✓ {t("password_good")}</p>
              )}
            </div>
            {/* Security Question */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("security_question_label")}</label>
              <div style={{ position: "relative" }}>
                <ShieldQuestion size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <select value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} className="input-base" style={{ paddingInlineStart: 40, cursor: "pointer" }} required>
                  <option value="">{t("security_question_pick")}</option>
                  {SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q}>{securityQuestionLabels[q] || q}</option>
                  ))}
                </select>
              </div>
            </div>
            {securityQuestion && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("your_answer")}</label>
                <div style={{ position: "relative" }}>
                  <Lock size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} className="input-base" style={{ paddingInlineStart: 40 }} placeholder={t("security_answer_placeholder")} required />
                </div>
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {t("agree_terms")}{" "}
              <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>{t("terms")}</a> and{" "}
              <a href="#" style={{ color: "var(--accent)", textDecoration: "none" }}>{t("privacy_policy")}</a>.
            </p>
            <button type="submit" disabled={isLoading} className="btn-accent" style={{ marginTop: 4, padding: "13px", fontSize: 14 }}>
              {isLoading ? t("creating_account") : role === "coach" ? t("join_as_coach") : t("join_as_athlete")}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("or")}</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "var(--border)" }} />
            </div>

            <button
              type="button"
              className="input-base"
              onClick={() => startSocialSignup("google")}
              style={{ padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", backgroundColor: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Chrome size={16} />
              {t("sign_up_google")}
            </button>
          </form>

          <p style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "var(--text-secondary)" }}>
            {t("have_account")}{" "}
            <Link to="/auth/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>{t("sign_in_link")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
