import { getApiBase } from "@/lib/api";
import { useState, useEffect } from "react";
import { Users, TrendingUp, Activity, CheckCircle, Clock, DollarSign, Star, MessageSquare, ClipboardList } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { Link } from "react-router-dom";

interface CoachStats {
  athletes: number;
  pendingRequests: number;
  monthlyRevenue: number;
  avgRating: number;
  reviewCount: number;
  sessionsThisWeek: number;
  completionRate: number;
  weekly: { day: string; sessions: number; revenue: number }[];
}

interface Session {
  id: number;
  athlete_name: string;
  athlete_avatar: string;
  date: string;
  time: string;
  booking_type: string;
  status: string;
}

interface ActivityItem {
  type: "booking" | "message" | "review";
  id: number;
  actor_name: string;
  actor_avatar: string;
  created_at: string;
  status?: string;
  content?: string;
  rating?: number;
}

export default function CoachHome() {
  const { user, token } = useAuth();
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const api = (path: string) =>
    fetch(getApiBase() + path, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });

  useEffect(() => {
    if (!token) return;
    Promise.allSettled([
      api("/api/coach/stats"),
      api("/api/coach/upcoming-sessions"),
      api("/api/coach/activity"),
    ])
      .then(([statsResult, sessionsResult, activityResult]) => {
        if (statsResult.status === "fulfilled" && statsResult.value?.weekly) {
          setStats(statsResult.value);
        } else {
          // Set empty stats to avoid crash
          setStats({ athletes: 0, pendingRequests: 0, monthlyRevenue: 0, avgRating: 0, reviewCount: 0, sessionsThisWeek: 0, completionRate: 0, weekly: [{day:'Sun',sessions:0,revenue:0},{day:'Mon',sessions:0,revenue:0},{day:'Tue',sessions:0,revenue:0},{day:'Wed',sessions:0,revenue:0},{day:'Thu',sessions:0,revenue:0},{day:'Fri',sessions:0,revenue:0},{day:'Sat',sessions:0,revenue:0}] });
        }
        if (sessionsResult.status === "fulfilled") setSessions(sessionsResult.value?.sessions || []);
        if (activityResult.status === "fulfilled") setActivity(activityResult.value?.activity || []);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return t("just_now");
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t("mins_ago")}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t("hours_ago")}`;
    return `${Math.floor(diff / 86400000)}${t("days_ago")}`;
  };

  const getActivityIcon = (item: ActivityItem) => {
    if (item.type === "booking") return { icon: ClipboardList, color: "var(--amber)", text: item.status === "pending" ? t("new_coaching_request_from").replace("{name}", item.actor_name) : t("booking_status_for").replace("{status}", item.status || "").replace("{name}", item.actor_name) };
    if (item.type === "message") return { icon: MessageSquare, color: "var(--blue)", text: t("sent_you_message").replace("{name}", item.actor_name) };
    if (item.type === "review") return { icon: Star, color: "var(--amber)", text: t("new_review_from").replace("{rating}", String(item.rating || 0)).replace("{name}", item.actor_name) };
    return { icon: CheckCircle, color: "var(--accent)", text: t("activity") };
  };

  const maxSessions = stats ? Math.max(...stats.weekly.map((d) => d.sessions), 1) : 1;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "var(--text-muted)", fontSize: 14 }}>
        {t("loading_dashboard")}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(18px,4vw,26px)", fontWeight: 700 }}>
            {t("welcome_back_name").replace("{name}", user?.name?.split(" ")[0] || "")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>{t("coach_overview_week")}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/coach/requests" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, backgroundColor: "var(--blue)", color: "#fff", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            <ClipboardList size={14} /> {t("requests")}
            {(stats?.pendingRequests || 0) > 0 && (
              <span style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{stats?.pendingRequests}</span>
            )}
          </Link>
          <Link to="/coach/profile" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
            {t("view_profile")}
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { label: t("my_athletes"), value: stats?.athletes ?? 0, icon: Users, color: "var(--blue)", link: "/coach/athletes" },
          { label: t("pending_requests"), value: stats?.pendingRequests ?? 0, icon: ClipboardList, color: "var(--amber)", link: "/coach/requests" },
          { label: t("sessions_per_week"), value: stats?.sessionsThisWeek ?? 0, icon: Activity, color: "var(--accent)", link: "/coach/athletes" },
          { label: t("monthly_revenue"), value: `${(stats?.monthlyRevenue ?? 0).toFixed(0)} ${t('currency_egp')}`, icon: DollarSign, color: "var(--cyan)", link: "/coach/ads" },
          { label: t("avg_rating"), value: `${stats?.avgRating ?? "—"}★`, icon: Star, color: "var(--amber)", link: "/coach/profile" },
          { label: t("completion_rate"), value: `${stats?.completionRate ?? 0}%`, icon: TrendingUp, color: "var(--accent)", link: "/coach/athletes" },
        ].map((s) => (
          <Link key={s.label} to={s.link} style={{ textDecoration: "none", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</p>
              <s.icon size={15} color={s.color} />
            </div>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</p>
          </Link>
        ))}
      </div>

      {/* Mid Row: Chart + Sessions */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Weekly chart */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("sessions_this_week")}</p>
            <span style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>{stats?.sessionsThisWeek ?? 0} {t("total")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {(stats?.weekly || []).map((d) => (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", backgroundColor: d.sessions > 0 ? "var(--blue)" : "var(--bg-surface)", borderRadius: "4px 4px 0 0", height: `${(d.sessions / maxSessions) * 80}px`, minHeight: 4, opacity: d.sessions > 0 ? 1 : 0.3, transition: "height 0.3s" }} />
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("upcoming_sessions")}</p>
            <Link to="/coach/requests" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>{t("view_all")}</Link>
          </div>
          {sessions.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", paddingTop: 20 }}>{t("no_upcoming_sessions")}</p>
          ) : sessions.slice(0, 3).map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < Math.min(sessions.length, 3) - 1 ? "1px solid var(--border)" : "none" }}>
              <img src={s.athlete_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}`} alt={s.athlete_name} style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "var(--bg-surface)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.athlete_name}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.date || t("tbd")} {s.time || ""} · {s.booking_type || t("session")}</p>
              </div>
              <div style={{ padding: "3px 10px", borderRadius: 20, backgroundColor: s.status === "accepted" ? "var(--accent-dim)" : "rgba(255,179,64,0.1)", fontSize: 11, fontWeight: 600, color: s.status === "accepted" ? "var(--accent)" : "var(--amber)", border: `1px solid ${s.status === "accepted" ? "rgba(200,255,0,0.3)" : "rgba(255,179,64,0.3)"}` }}>
                {s.status === "accepted" ? t("confirmed") : t("pending")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{t("recent_activity")}</p>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t("live")}</span>
        </div>
        {activity.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", paddingTop: 12 }}>{t("no_recent_activity")}</p>
        ) : activity.map((a, i) => {
          const { icon: Icon, color, text } = getActivityIcon(a);
          return (
            <div key={`${a.type}-${a.id}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < activity.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</p>
                {a.type === "message" && a.content && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.content}</p>
                )}
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{formatTime(a.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
