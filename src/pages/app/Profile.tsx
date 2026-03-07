import { getApiBase } from "@/lib/api";
import { User, Camera, Ruler, Weight, Crown, Sun, Moon, Bell, Globe, LogOut, Gift, Star, Upload, FileText, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/context/I18nContext";

export default function Profile() {
  const { user, token, logout, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [medicalFile, setMedicalFile] = useState<File | null>(null);
  const [medicalFileUrl, setMedicalFileUrl] = useState<string | null>(null);
  const [medicalSaving, setMedicalSaving] = useState(false);
  const [medicalMsg, setMedicalMsg] = useState("");
  const medFileRef = useRef<HTMLInputElement>(null);
  const { t, setLang } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [height, setHeight] = useState(user?.height || 0);
  const [weight, setWeight] = useState(user?.weight || 0);
  const [gender, setGender] = useState<"male" | "female" | "other">((user?.gender as "male" | "female" | "other") || "other");
  const [name, setName] = useState(user?.name || "");
  const [language, setLanguage] = useState(localStorage.getItem("fithub_lang") || "en");
  const [notifications, setNotifications] = useState(() => JSON.parse(localStorage.getItem("fithub_notifications") || "true"));
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      fetch(getApiBase() + "/api/user/medical-history", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { 
          if (d.medical_history) setMedicalHistory(d.medical_history);
          if (d.medical_file_url) setMedicalFileUrl(d.medical_file_url);
        })
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(getApiBase() + "/api/user/points/history", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setPointsHistory(Array.isArray(d?.transactions) ? d.transactions : []))
      .catch(() => setPointsHistory([]));
  }, [token]);

  useEffect(() => {
    setName(user?.name || "");
    setHeight(user?.height || 0);
    setWeight(user?.weight || 0);
    setGender((user?.gender as "male" | "female" | "other") || "other");
  }, [user?.name, user?.height, user?.weight, user?.gender]);

  const saveMedicalHistory = async () => {
    setMedicalSaving(true);
    try {
      if (medicalFile) {
        const fd = new FormData();
        fd.append("medical", medicalFile);
        fd.append("medical_history", medicalHistory);
        const res = await fetch(getApiBase() + "/api/user/medical-history", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (res.ok) { const d = await res.json(); if (d.file_url) setMedicalFileUrl(d.file_url); }
      } else {
        await fetch(getApiBase() + "/api/user/medical-history", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ medical_history: medicalHistory }) });
      }
      setMedicalMsg(t("medical_history_saved"));
      setTimeout(() => setMedicalMsg(""), 3000);
      setMedicalFile(null);
    } catch { setMedicalMsg(t("failed_save")); }
    finally { setMedicalSaving(false); }
  };

  const handleSave = () => { updateUser({ name, height, weight, gender }); setIsEditing(false); };

  const card = { backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" };

  return (
    <div style={{ padding: isMobile ? "16px 12px 40px" : "24px 20px 40px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700 }}>{t("profile_title")}</h1>
        <button onClick={toggleTheme} style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isDark ? "var(--amber)" : "var(--text-secondary)" }}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Avatar + Info */}
      <div style={{ ...card, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, marginBottom: 16 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <img src={user?.avatar} alt="Avatar" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border-light)" }} />
          <button style={{ position: "absolute", bottom: 0, insetInlineEnd: 0, width: 26, height: 26, borderRadius: "50%", backgroundColor: "var(--accent)", color: "#0A0A0B", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={13} />
          </button>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700 }}>{user?.name}</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{user?.email}</p>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {user?.isPremium ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, backgroundColor: "rgba(255,179,64,0.12)", border: "1px solid rgba(255,179,64,0.3)", fontSize: 12, fontWeight: 700, color: "var(--amber)" }}>
                <Crown size={12} /> {t("premium_member")}
              </span>
            ) : (
              <button onClick={() => navigate("/app/pricing")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, backgroundColor: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.25)", fontSize: 12, fontWeight: 700, color: "var(--accent)", cursor: "pointer" }}>
                {t("upgrade_premium")}
              </button>
            )}
          </div>
        </div>
        <div style={{ textAlign: "end", flexShrink: 0 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--accent)" }}>{user?.points?.toLocaleString() ?? 0}</p>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("points")}</p>
          <button onClick={() => setShowPointsHistory(v => !v)} style={{ marginTop: 4, fontSize: 11, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            {showPointsHistory ? t("hide_history") : t("view_history")}
          </button>
        </div>
      </div>

      {/* Points History */}
      {showPointsHistory && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Gift size={16} color="var(--accent)" />
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("points_history")}</h3>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{t("how_to_earn_points")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
              <span>🎁 <strong style={{ color: "var(--accent)" }}>+200 pts</strong> — {t("points_rule_signup")}</span>
              <span>🎬 <strong style={{ color: "var(--accent)" }}>+2 pts</strong> — {t("points_rule_video")}</span>
              <span>🏆 <strong style={{ color: "var(--accent)" }}>+2 pts</strong> — {t("points_rule_steps")}</span>
            </div>
          </div>
          {pointsHistory.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>{t("no_point_transactions")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
              {pointsHistory.map((tx: any) => (
                <div key={tx.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 10, background: "var(--bg-surface)" }}>
                  <div>
                    <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{tx.reason}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, color: tx.points > 0 ? "var(--accent)" : "var(--red)" }}>
                    {tx.points > 0 ? "+" : ""}{tx.points} {t("pts")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body Metrics */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("body_metrics")}</h3>
          <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} style={{ padding: "6px 16px", borderRadius: 9, backgroundColor: isEditing ? "var(--accent)" : "var(--bg-surface)", border: `1px solid ${isEditing ? "transparent" : "var(--border)"}`, color: isEditing ? "#0A0A0B" : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: isEditing ? "'Chakra Petch', sans-serif" : "inherit" }}>
            {isEditing ? t("save") : t("edit")}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: t("height_label"), icon: Ruler, unit: "cm", val: height, set: setHeight },
            { label: t("weight_label"), icon: Weight, unit: "kg", val: weight, set: setWeight },
          ].map((field) => (
            <div key={field.label} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <field.icon size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{field.label}</span>
              </div>
              {isEditing ? (
                <input type="number" value={field.val} onChange={(e) => field.set(Number(e.target.value))} className="input-base" style={{ padding: "8px 10px" }} />
              ) : (
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
                  {field.val || "—"} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-secondary)" }}>{field.unit}</span>
                </p>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Gender</p>
          {isEditing ? (
            <select value={gender} onChange={(e) => setGender(e.target.value as "male" | "female" | "other")} className="input-base" style={{ padding: "8px 10px" }}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          ) : (
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>{gender || "-"}</p>
          )}
        </div>
      </div>

      {/* Medical History */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <FileText size={16} color="var(--red)" />
          <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("medical_history_short")}</h3>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          {t("medical_history_private")}
        </p>
        <textarea
          value={medicalHistory}
          onChange={e => setMedicalHistory(e.target.value)}
          placeholder={t("medical_history_placeholder_full")}
          rows={4}
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", width: "100%", fontSize: 13, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", outline: "none", resize: "vertical", marginBottom: 12, boxSizing: "border-box" }}
        />
        {/* File upload */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{t("attach_medical_document")}</p>
          <div
            onClick={() => medFileRef.current?.click()}
            style={{ border: "2px dashed var(--border)", borderRadius: 10, padding: "14px", textAlign: "center", cursor: "pointer", backgroundColor: "var(--bg-surface)" }}>
            {medicalFile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--accent)" }}>📎 {medicalFile.name}</span>
                <button onClick={(e) => { e.stopPropagation(); setMedicalFile(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={14} /></button>
              </div>
            ) : medicalFileUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={16} color="var(--blue)" />
                <a href={medicalFileUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12, color: "var(--blue)" }}>{t("view_uploaded_document")}</a>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>· {t("click_to_replace")}</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <Upload size={20} color="var(--text-muted)" />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("upload_document_prompt")}</span>
              </div>
            )}
          </div>
          <input ref={medFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: "none" }} onChange={e => setMedicalFile(e.target.files?.[0] || null)} />
        </div>
        {medicalMsg && <p style={{ fontSize: 12, color: medicalMsg.startsWith("✅") ? "var(--accent)" : "var(--red)", marginBottom: 8 }}>{medicalMsg}</p>}
        <button onClick={saveMedicalHistory} disabled={medicalSaving} style={{ padding: "9px 20px", borderRadius: 10, backgroundColor: medicalSaving ? "var(--bg-surface)" : "var(--blue)", border: "none", color: medicalSaving ? "var(--text-muted)" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif" }}>
          {medicalSaving ? t("saving") : t("save_medical_history")}
        </button>
      </div>

      {/* Settings */}
      <div style={card}>
        <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t("settings")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Theme */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isDark ? <Moon size={16} color="var(--text-secondary)" /> : <Sun size={16} color="var(--text-secondary)" />}
              <span style={{ fontSize: 14 }}>{t("theme")}</span>
            </div>
            <button onClick={toggleTheme} style={{ padding: "5px 14px", borderRadius: 20, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", fontSize: 12, cursor: "pointer", color: "var(--text-secondary)" }}>
              {isDark ? t("dark") : t("light_theme")}
            </button>
          </div>
          {/* Language */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Globe size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: 14 }}>{t("language_label")}</span>
            </div>
            <select value={language} onChange={(e) => { setLanguage(e.target.value); setLang(e.target.value); localStorage.setItem("fithub_lang", e.target.value); }}
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "var(--text-primary)", cursor: "pointer" }}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          {/* Notifications */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bell size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: 14 }}>{t("notifications")}</span>
            </div>
            <button onClick={() => { const n = !notifications; setNotifications(n); localStorage.setItem("fithub_notifications", JSON.stringify(n)); }}
              style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: notifications ? "var(--accent)" : "var(--bg-surface)", border: `1px solid ${notifications ? "transparent" : "var(--border)"}`, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", top: 3, insetInlineStart: notifications ? 22 : 3, width: 16, height: 16, borderRadius: "50%", backgroundColor: notifications ? "#0A0A0B" : "var(--text-muted)", transition: "left 0.2s" }} />
            </button>
          </div>
          {/* Sign out */}
          <button onClick={() => { logout(); navigate("/auth/login"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 14, textAlign: "start" }}>
            <LogOut size={16} /> {t("sign_out")}
          </button>
        </div>
      </div>
    </div>
  );
}
