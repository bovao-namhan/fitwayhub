import { getApiBase } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Lock, TrendingUp, Zap, Activity, Flame, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useI18n } from "@/context/I18nContext";

type RecentSession = { id: number; start_time: string; end_time: string; total_steps: number; total_distance_km: number; calories: number; };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
      <p style={{ color: "var(--text-secondary)", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: "var(--accent)", fontWeight: 700 }}>{p.value?.toLocaleString()} {p.name}</p>)}
    </div>
  );
};

export default function Analytics() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    fetch(getApiBase() + "/api/analytics/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setMetrics(d)).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  if (!user?.isPremium) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Lock size={28} color="var(--text-muted)" />
        </div>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>{t("premium_feature_title") || "Premium Feature"}</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 380, lineHeight: 1.7, marginBottom: 24 }}>{t("premium_feature_desc") || "Upgrade to unlock advanced analytics, AI insights, and session history."}</p>
        <Link to="/app/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 11, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>{t("upgrade_premium") || "Upgrade to Premium"}</Link>
      </div>
    );
  }

  const weekly = metrics?.weekly || [];
  const avgSteps = weekly.length ? Math.round(weekly.reduce((a: number, b: any) => a + b.steps, 0) / 7) : 0;
  const activeDays = weekly.filter((d: any) => d.steps > 0).length;
  const consistency = Math.round((activeDays / 7) * 100);

  const metricCards = [
    { label: t("avg_daily_steps") || "Avg Daily Steps", value: avgSteps.toLocaleString(), color: "var(--accent)", icon: Activity },
    { label: t("total_sessions") || "Total Sessions", value: (metrics?.sessionsCount || 0).toString(), color: "var(--blue)", icon: Target },
    { label: t("calories_burned") || "Calories Burned", value: (metrics?.totalCalories || 0).toLocaleString(), color: "var(--red)", icon: Flame },
    { label: t("consistency") || "Consistency", value: `${consistency}%`, color: "var(--cyan)", icon: TrendingUp },
  ];

  return (
    <div style={{ padding: isMobile ? "16px 12px 40px" : "24px 20px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700 }}>{t("advanced_analytics") || "Analytics"}</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 14px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer" }}>
            <option>Last 6 Months</option><option>Last 30 Days</option><option>This Year</option>
          </select>
          <button onClick={async () => {
            try { const r = await fetch(getApiBase() + "/api/ai/analytics", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" }, body: "{}" }); if (r.ok) { const j = await r.json(); alert(j.insights || "No insights."); return; } } catch {}
            alert(`Total Steps: ${metrics?.totalSteps?.toLocaleString()}\nAvg: ${avgSteps}\nConsistency: ${consistency}%`);
          }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
            <Zap size={14} /> {t("generate_ai_insights") || "AI Insights"}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {metricCards.map((m) => (
          <div key={m.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</span>
              <div style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: `${m.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <m.icon size={14} color={m.color} />
              </div>
            </div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 26, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{loading ? "—" : m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
        {/* Weekly steps */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 16px" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Weekly Steps</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly.length ? weekly : Array.from({length:7},(_,i)=>({day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],steps:0,calories:0}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="steps" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Calories area */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 16px" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Calories Trend</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weekly.length ? weekly : Array.from({length:7},(_,i)=>({day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i],steps:0,calories:0}))}>
              <defs><linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#FF4444" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="calories" stroke="#FF4444" strokeWidth={2} fill="url(#calGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary + Sessions */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t("summary") || "Summary"}</p>
          {loading ? <p style={{ color: "var(--text-muted)" }}>Loading…</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: t("total_steps") || "Total Steps", val: metrics?.totalSteps?.toLocaleString() || 0 },
                { label: t("total_distance") || "Total Distance", val: `${(metrics?.totalDistance || 0).toFixed(2)} km` },
                { label: t("total_calories") || "Total Calories", val: metrics?.totalCalories || 0 },
                { label: t("premium_sessions") || "Sessions", val: metrics?.sessionsCount || 0 },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px" }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t("recent_sessions") || "Recent Sessions"}</p>
          {loading ? <p style={{ color: "var(--text-muted)" }}>Loading…</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(metrics?.recentSessions || []).slice(0, 5).map((s: RecentSession) => (
                <div key={s.id} style={{ padding: "10px 12px", backgroundColor: "var(--bg-surface)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{new Date(s.start_time).toLocaleDateString()}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.end_time ? `${Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)} min` : "—"}</p>
                  </div>
                  <div style={{ textAlign: "end" }}>
                    <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{s.total_steps.toLocaleString()}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.total_distance_km.toFixed(2)} km</p>
                  </div>
                </div>
              ))}
              {(metrics?.recentSessions || []).length === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No sessions yet.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
