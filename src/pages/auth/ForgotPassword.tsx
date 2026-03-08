import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ShieldQuestion, Activity, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { getApiBase } from "@/lib/api";
import { useI18n } from "@/context/I18nContext";

type Step = "email" | "answer" | "done";

export default function ForgotPassword() {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const questionMap: Record<string, string> = {
    "What was the name of your first pet?": t("security_question_1"),
    "What city were you born in?": t("security_question_2"),
    "What is your mother's maiden name?": t("security_question_3"),
    "What was the name of your first school?": t("security_question_4"),
    "What is your favorite childhood movie?": t("security_question_5"),
    "What was the make of your first car?": t("security_question_6"),
  };

  const localizedQuestion = questionMap[question] || question;

  const handleGetQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError(t("please_enter_your_email")); return; }
    setIsLoading(true);
    try {
      const res = await fetch(getApiBase() + "/api/auth/forgot-password/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("account_not_found"));
      setQuestion(data.question);
      setStep("answer");
    } catch (err: any) {
      setError(err.message || t("failed_find_account"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!securityAnswer.trim()) { setError(t("please_enter_your_answer")); return; }
    if (newPassword.length < 8) { setError(t("password_min_8_chars")); return; }
    setIsLoading(true);
    try {
      const res = await fetch(getApiBase() + "/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, securityAnswer, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t("verification_failed"));
      setStep("done");
    } catch (err: any) {
      setError(err.message || t("failed_reset_password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)", display: "flex" }}>
      {/* Left panel */}
      <div className="hidden lg:flex" style={{ width: "45%", backgroundColor: "var(--bg-surface)", borderInlineEnd: "1px solid var(--border)", flexDirection: "column", justifyContent: "space-between", padding: "48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: "20%", insetInlineStart: "5%", width: 300, height: 300, borderRadius: "50%", backgroundColor: "var(--accent)", opacity: 0.07, filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ backgroundColor: "var(--accent)", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="#0A0A0B" />
          </div>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.04em" }}>{t("fitway_hub")}</span>
        </div>
        <div>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
            {t("dont_worry")}<br /><span style={{ color: "var(--accent)" }}>{t("weve_got_you")}</span>
          </p>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: 340 }}>
            {t("forgot_password_helper")}
          </p>
        </div>
        <div />
      </div>

      {/* Right: form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div className="fade-up" style={{ width: "100%", maxWidth: 420 }}>
          <button type="button" onClick={() => navigate("/auth/login")} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 13, padding: 0 }}>
            <ArrowLeft size={14} /> {t("back_to_login")}
          </button>

          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
            <div style={{ backgroundColor: "var(--accent)", width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Activity size={15} color="#0A0A0B" />
            </div>
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700 }}>{t("fitway_hub")}</span>
          </div>

          {step === "done" ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "rgba(200,255,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle size={32} color="var(--accent)" />
              </div>
              <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{t("password_reset_success")}</h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>{t("password_reset_success_desc")}</p>
              <button onClick={() => navigate("/auth/login")} className="btn-accent" style={{ padding: "13px 32px", fontSize: 14 }}>
                {t("sign_in_now")}
              </button>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
                {step === "email" ? t("forgot_password_title") : t("verify_identity")}
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
                {step === "email" ? t("forgot_password_step_desc") : t("verify_identity_step_desc")}
              </p>

              {/* Progress dots */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "var(--accent)" }} />
                <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: step === "answer" ? "var(--accent)" : "var(--border)" }} />
              </div>

              {error && (
                <div style={{ padding: "12px 16px", backgroundColor: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.25)", borderRadius: 10, color: "var(--red)", fontSize: 13, marginBottom: 20 }}>
                  {error}
                </div>
              )}

              {step === "email" && (
                <form onSubmit={handleGetQuestion} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("email_or_username")}</label>
                    <div style={{ position: "relative" }}>
                      <Mail size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" style={{ paddingInlineStart: 40 }} placeholder="you@example.com" required autoFocus />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="btn-accent" style={{ padding: "13px", fontSize: 14, marginTop: 4 }}>
                    {isLoading ? t("looking_up") : t("continue_label")}
                  </button>
                </form>
              )}

              {step === "answer" && (
                <form onSubmit={handleVerifyAndReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Show the question */}
                  <div style={{ padding: "14px 16px", backgroundColor: "rgba(200,255,0,0.06)", border: "1px solid rgba(200,255,0,0.2)", borderRadius: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <ShieldQuestion size={16} color="var(--accent)" />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("security_question_label")}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{localizedQuestion}</p>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("your_answer")}</label>
                    <div style={{ position: "relative" }}>
                      <ShieldQuestion size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} className="input-base" style={{ paddingInlineStart: 40 }} placeholder={t("type_your_answer")} required autoFocus />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{t("new_password")}</label>
                    <div style={{ position: "relative" }}>
                      <Lock size={15} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                      <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-base" style={{ paddingInlineStart: 40, paddingInlineEnd: 44 }} placeholder={t("min_chars")} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", insetInlineEnd: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {newPassword.length > 0 && newPassword.length < 8 && (
                      <p style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>⚠ {8 - newPassword.length} {lang === "ar" ? "حرف كمان" : `more character${8 - newPassword.length !== 1 ? "s" : ""} needed`}</p>
                    )}
                  </div>

                  <button type="submit" disabled={isLoading} className="btn-accent" style={{ padding: "13px", fontSize: 14, marginTop: 4 }}>
                    {isLoading ? t("verifying") : t("reset_password")}
                  </button>
                  <button type="button" onClick={() => { setStep("email"); setError(""); }} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                    ← {t("try_different_email")}
                  </button>
                </form>
              )}
            </>
          )}

          <p style={{ marginTop: 28, textAlign: "center", fontSize: 14, color: "var(--text-secondary)" }}>
            {t("remember_your_password")}{" "}
            <Link to="/auth/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>{t("sign_in_link")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
