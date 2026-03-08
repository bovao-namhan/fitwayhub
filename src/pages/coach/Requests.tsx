import { getApiBase } from "@/lib/api";
import { useState, useEffect } from "react";
import { CheckCircle, X, Clock, ChevronDown, ChevronUp, User, Ruler, Weight, Camera, AlertCircle, Calendar, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

interface CoachingRequest {
  id: number; user_id: number; user_name: string; user_email: string; user_avatar: string;
  created_at: string; status: "pending" | "accepted" | "rejected";
  note: string; date: string; time: string; plan: string; level: string; booking_type: string;
  now_body_photo?: string; dream_body_photo?: string;
}

interface UserProfile {
  id: number; name: string; email: string; avatar: string;
  height?: number; weight?: number; gender?: string; age?: number;
  is_premium?: boolean; points?: number; steps?: number;
}

interface CoachSubscriptionRequest {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_avatar?: string;
  plan_cycle: "monthly" | "yearly";
  plan_type: string;
  amount: number;
  status: string;
  payment_proof?: string;
  created_at: string;
}

export default function CoachRequests() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [userProfiles, setUserProfiles] = useState<Record<number, UserProfile>>({});
  const [loadingProfile, setLoadingProfile] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [subscriptionRequests, setSubscriptionRequests] = useState<CoachSubscriptionRequest[]>([]);

  const api = (path: string, opts?: RequestInit) =>
    fetch(getApiBase() + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });

  const fetchRequests = async () => {
    try {
      const r = await api("/api/coaching/requests");
      if (r.ok) { const d = await r.json(); setRequests(d.requests || []); }
    } catch {} finally { setLoading(false); }
  };

  const fetchSubscriptionRequests = async () => {
    try {
      const r = await api("/api/payments/coach-subscription-requests");
      if (r.ok) {
        const d = await r.json();
        setSubscriptionRequests(d.subscriptions || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchRequests();
    fetchSubscriptionRequests();
  }, []);

  const fetchUserProfile = async (userId: number) => {
    if (userProfiles[userId]) return;
    setLoadingProfile(userId);
    try {
      const r = await fetch(getApiBase() + `/api/coach/users/${userId}/profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); setUserProfiles(p => ({ ...p, [userId]: d.user })); }
    } catch {} finally { setLoadingProfile(null); }
  };

  const toggleExpand = (req: CoachingRequest) => {
    if (expandedId === req.id) { setExpandedId(null); } else {
      setExpandedId(req.id);
      fetchUserProfile(req.user_id);
    }
  };

  const updateStatus = async (id: number, status: "accepted" | "rejected") => {
    try {
      const r = await api(`/api/coaching/requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (r.ok) {
        setRequests(rs => rs.map(r => r.id === id ? { ...r, status } : r));
        setMessage(status === "accepted" ? t("coach_requests_athlete_accepted") : t("coach_requests_request_declined"));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {}
  };

  const pending = requests.filter(r => r.status === "pending");
  const accepted = requests.filter(r => r.status === "accepted");
  const rejected = requests.filter(r => r.status === "rejected");

  const handleSubscriptionDecision = async (id: number, action: "accept" | "decline") => {
    try {
      const endpoint = action === "accept" ? `/api/payments/coach-subscriptions/${id}/coach-accept` : `/api/payments/coach-subscriptions/${id}/coach-decline`;
      const r = await api(endpoint, {
        method: "PATCH",
        body: action === "decline" ? JSON.stringify({ reason: t('declined_by_coach') }) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setSubscriptionRequests((prev) => prev.filter((s) => s.id !== id));
        setMessage(action === "accept" ? t("coach_requests_subscription_accepted") : t("coach_requests_subscription_declined"));
        setTimeout(() => setMessage(""), 3500);
      } else {
        setMessage(d.message || t("coach_requests_subscription_process_failed"));
        setTimeout(() => setMessage(""), 3500);
      }
    } catch {
      setMessage(t("coach_requests_subscription_process_failed"));
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const RequestCard = ({ req }: { req: CoachingRequest }) => {
    const expanded = expandedId === req.id;
    const profile = userProfiles[req.user_id];
    const isLoadingThis = loadingProfile === req.user_id;

    return (
      <div style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${req.status === "pending" ? "rgba(255,179,64,0.3)" : req.status === "accepted" ? "rgba(200,255,0,0.2)" : "var(--border)"}`, borderRadius: 16, overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => toggleExpand(req)}>
          <img src={req.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user_email}`} alt={req.user_name} style={{ width: 46, height: 46, borderRadius: "50%", backgroundColor: "var(--bg-surface)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{req.user_name}</p>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, background: req.status === "pending" ? "rgba(255,179,64,0.1)" : req.status === "accepted" ? "rgba(200,255,0,0.1)" : "rgba(255,68,68,0.08)", color: req.status === "pending" ? "var(--amber)" : req.status === "accepted" ? "var(--accent)" : "var(--red)", border: `1px solid ${req.status === "pending" ? "rgba(255,179,64,0.3)" : req.status === "accepted" ? "rgba(200,255,0,0.25)" : "rgba(255,68,68,0.2)"}` }}>
                {req.status === "pending" ? `⏳ ${t("pending")}` : req.status === "accepted" ? `✓ ${t("accepted")}` : `✗ ${t("declined")}`}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {req.plan} {t("coach_requests_plan_suffix")} · {req.booking_type === "session" ? t("coach_requests_per_session") : t("monthly_plan")} · {new Date(req.created_at).toLocaleDateString()}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {req.status === "pending" && (
              <>
                <button onClick={e => { e.stopPropagation(); updateStatus(req.id, "accepted"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, background: "rgba(200,255,0,0.1)", border: "1px solid rgba(200,255,0,0.3)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <CheckCircle size={13} /> {t("accept")}
                </button>
                <button onClick={e => { e.stopPropagation(); updateStatus(req.id, "rejected"); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", color: "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <X size={13} /> {t("decline")}
                </button>
              </>
            )}
            {expanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
          </div>
        </div>

        {/* Expanded: full details */}
        {expanded && (
          <div style={{ borderTop: "1px solid var(--border)", padding: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

              {/* Left: User Profile */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={11} /> {t("coach_requests_athlete_profile")}
                </p>
                {isLoadingThis ? (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "12px 0" }}>{t("coach_requests_loading_profile")}</div>
                ) : profile ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Avatar + basic info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", backgroundColor: "var(--bg-surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      <img src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.email}`} alt={profile.name} style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0 }} />
                      <div>
                        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{profile.name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{profile.email}</p>
                        <p style={{ fontSize: 11, color: "var(--accent)", marginTop: 2 }}>{profile.is_premium ? `⚡ ${t("premium_member")}` : t("free_label")}</p>
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: t("height_label"), value: profile.height ? `${profile.height} cm` : "—", icon: "📏" },
                        { label: t("weight_label"), value: profile.weight ? `${profile.weight} kg` : "—", icon: "⚖️" },
                        { label: t("coach_requests_gender"), value: profile.gender ? (profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)) : "—", icon: "👤" },
                        { label: t("points"), value: profile.points?.toLocaleString() ?? "0", icon: "⭐" },
                        { label: t("coach_requests_steps_today"), value: profile.steps?.toLocaleString() ?? "0", icon: "🦶" },
                        { label: t("coach_requests_age"), value: profile.age ? `${profile.age} ${t("coach_requests_years_short")}` : "—", icon: "🎂" },
                      ].map(s => (
                        <div key={s.label} style={{ backgroundColor: "var(--bg-surface)", borderRadius: 10, padding: "10px 12px", border: "1px solid var(--border)" }}>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{s.icon} {s.label}</p>
                          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--blue)" }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>{t("coach_requests_profile_unavailable")}</div>
                )}
              </div>

              {/* Right: Request Details */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar size={11} /> {t("coach_requests_request_details")}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: t("table_date"), value: req.date || t("coach_requests_tbd") },
                    { label: t("coach_requests_time"), value: req.time || t("coach_requests_tbd") },
                    { label: t("plan_type"), value: req.plan || t("coach_requests_complete") },
                    { label: t("coach_requests_level"), value: `${t("coach_requests_level")} ${req.level || "1"}` },
                    { label: t("table_type"), value: req.booking_type === "session" ? t("coach_requests_per_session") : t("monthly_plan") },
                    { label: t("coach_requests_requested"), value: new Date(req.created_at).toLocaleDateString() },
                  ].map(s => (
                    <div key={s.label} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{s.label}</p>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--blue)", textTransform: "capitalize" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
                {req.note && (
                  <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>💬 {t("coach_requests_message_from_athlete")}</p>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>"{req.note}"</p>
                  </div>
                )}

                {/* Body photos */}
                {(req.now_body_photo || req.dream_body_photo) && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <Camera size={11} /> {t("coach_requests_body_photos")}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: t("coach_requests_now_body"), src: req.now_body_photo },
                        { label: t("coach_requests_dream_body"), src: req.dream_body_photo },
                      ].map(p => p.src ? (
                        <div key={p.label} style={{ cursor: "pointer" }} onClick={() => setLightboxSrc(p.src!)}>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{p.label}</p>
                          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "3/4" }}>
                            <img src={p.src} alt={p.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0)", transition: "background 0.15s" }} onMouseOver={e => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.3)")} onMouseOut={e => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0)")}>
                              <Camera size={18} color="#fff" style={{ opacity: 0 }} />
                            </div>
                          </div>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(18px,4vw,26px)", fontWeight: 700 }}>{t("coach_requests_title")}</h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>{t("coach_requests_subtitle")}</p>
      </div>

      {message && <div style={{ padding: "10px 16px", backgroundColor: message.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${message.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 10, fontSize: 13, color: message.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{message}</div>}

      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{t("coach_requests_paid_subscriptions")}</p>
          <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700 }}>{subscriptionRequests.length} {t("pending")}</span>
        </div>
        {subscriptionRequests.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "4px 0" }}>{t("coach_requests_no_paid_subscriptions")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subscriptionRequests.map((sub) => (
              <div key={sub.id} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid rgba(255,179,64,0.25)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src={sub.user_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.user_email}`} alt={sub.user_name} style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "var(--bg-card)" }} />
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{sub.user_name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub.plan_cycle} · {sub.plan_type} · {sub.amount} {t('currency_egp')}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700 }}>{new Date(sub.created_at).toLocaleDateString()}</span>
                </div>
                {sub.payment_proof && (
                  <div style={{ marginBottom: 10 }}>
                    <img
                      src={sub.payment_proof.startsWith("http") ? sub.payment_proof : getApiBase() + sub.payment_proof}
                      alt={t('payment_proof')}
                      style={{ maxHeight: 130, borderRadius: 8, border: "1px solid var(--border)" }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleSubscriptionDecision(sub.id, "accept")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "rgba(200,255,0,0.12)", border: "1px solid rgba(200,255,0,0.35)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    <CheckCircle size={13} /> {t("accept")}
                  </button>
                  <button onClick={() => handleSubscriptionDecision(sub.id, "decline")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px", borderRadius: 8, background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)", color: "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    <X size={13} /> {t("coach_requests_decline_refund")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[{ label: t("pending"), count: pending.length, color: "var(--amber)" }, { label: t("accepted"), count: accepted.length, color: "var(--accent)" }, { label: t("declined"), count: rejected.length, color: "var(--text-muted)" }].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 100, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 26, fontWeight: 700, color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>{t("coach_requests_loading")}</div>
      ) : requests.length === 0 ? (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 40, textAlign: "center" }}>
          <AlertCircle size={40} strokeWidth={1} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, color: "var(--text-muted)" }}>{t("coach_requests_empty")}</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} /> {t("coach_requests_awaiting_review")} ({pending.length})
              </p>
              {pending.map(r => <div key={r.id}><RequestCard req={r} /></div>)}
            </div>
          )}
          {accepted.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={12} /> {t("accepted")} ({accepted.length})
              </p>
              {accepted.map(r => <div key={r.id}><RequestCard req={r} /></div>)}
            </div>
          )}
          {rejected.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{t("declined")} ({rejected.length})</p>
              {rejected.map(r => <div key={r.id}><RequestCard req={r} /></div>)}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt={t('body_photo')} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }} />
          <button style={{ position: "absolute", top: 20, insetInlineEnd: 20, width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
