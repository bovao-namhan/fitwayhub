import { getApiBase } from "@/lib/api";
import { Calendar, MessageSquare, Star, Lock, X, Search, SlidersHorizontal, Camera, UserPlus, UserCheck, Gift } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import PaymentForm from "@/components/app/PaymentForm";

const specialties = ["All", "Strength & Conditioning", "HIIT & Weight Loss", "Yoga & Mobility", "Nutrition & Fitness", "Cardio & Endurance"];
const locations = ["All Locations", "Cairo", "Alexandria", "Giza"];
const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "monthly_asc", label: "Monthly: Low to High" },
  { value: "monthly_desc", label: "Monthly: High to Low" },
  { value: "sessions", label: "Most Experienced" },
];

interface Coach {
  id: number; name: string; email: string; avatar: string;
  bio: string; specialty: string; location: string;
  available: boolean; sessions_count: number; rating: number; review_count: number;
  plan_types?: string; monthly_price?: number; yearly_price?: number;
}

export default function Coaching() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingCoach, setBookingCoach] = useState<Coach | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingType, setBookingType] = useState<"month">("month");
  const [bookingPlan, setBookingPlan] = useState<"complete" | "nutrition" | "workout">("complete");
  const [bookingLevel, setBookingLevel] = useState<"1" | "2" | "3">("1");
  const [bookingMsg, setBookingMsg] = useState("");
  const [nowBodyPhoto, setNowBodyPhoto] = useState<File | null>(null);
  const [dreamBodyPhoto, setDreamBodyPhoto] = useState<File | null>(null);
  const [nowBodyPreview, setNowBodyPreview] = useState<string | null>(null);
  const [dreamBodyPreview, setDreamBodyPreview] = useState<string | null>(null);

  const [reviewingCoach, setReviewingCoach] = useState<Coach | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState("");
  const [coachReviews, setCoachReviews] = useState<Record<number, any[]>>({});

  const [query, setQuery] = useState("");
  const [searchField, setSearchField] = useState<"name" | "plan" | "monthly">("name");
  const [specialty, setSpecialty] = useState("All");
  const [location, setLocation] = useState("All Locations");
  const [planTypeFilter, setPlanTypeFilter] = useState<"all" | "complete" | "nutrition" | "workout">("all");
  const [monthlyMin, setMonthlyMin] = useState("");
  const [monthlyMax, setMonthlyMax] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [followedCoaches, setFollowedCoaches] = useState<Set<number>>(new Set());
  const [subscribedCoaches, setSubscribedCoaches] = useState<Record<number, any>>({});
  const [subscribeCoach, setSubscribeCoach] = useState<Coach | null>(null);
  const [subCycle, setSubCycle] = useState<"monthly" | "yearly">("monthly");
  const [subMsg, setSubMsg] = useState("");

  const [giftCoach, setGiftCoach] = useState<Coach | null>(null);
  const [giftAmount, setGiftAmount] = useState("50");
  const [giftMessage, setGiftMessage] = useState("");
  const [giftMsg, setGiftMsg] = useState("");
  const [giftSending, setGiftSending] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetch(getApiBase() + "/api/coaching/coaches", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const coachList = d.coaches || [];
        setCoaches(coachList);
        // Load follow statuses
        fetch(getApiBase() + "/api/coach/following", { headers: { Authorization: `Bearer ${token}` } })
          .then(r2 => r2.json())
          .then(d2 => {
            const ids = new Set<number>((d2.coaches || []).map((c: any) => c.id));
            setFollowedCoaches(ids);
          })
          .catch(() => {});
        // Load subscription statuses for all coaches
        coachList.forEach((c: Coach) => {
          fetch(getApiBase() + `/api/payments/coach-subscription-status/${c.id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r2 => r2.json())
            .then(d2 => {
              setSubscribedCoaches(prev => ({ ...prev, [c.id]: d2 }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const sendGift = async () => {
    if (!giftCoach) return;
    const amt = parseInt(giftAmount);
    if (!amt || amt <= 0) { setGiftMsg("Enter a valid amount"); return; }
    setGiftSending(true);
    try {
      const r = await fetch(getApiBase() + "/api/coaching/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ coachId: giftCoach.id, amount: amt, message: giftMessage }),
      });
      const d = await r.json();
      if (r.ok) {
        setGiftMsg("✅ Gift sent successfully!");
        setTimeout(() => { setGiftCoach(null); setGiftMsg(""); setGiftAmount("50"); setGiftMessage(""); }, 2000);
      } else { setGiftMsg(d.message || "Failed to send gift"); }
    } catch { setGiftMsg("❌ Failed to send gift"); }
    finally { setGiftSending(false); }
  };

  const toggleFollowCoach = async (coachId: number) => {
    const isFollowing = followedCoaches.has(coachId);
    try {
      if (isFollowing) {
        await fetch(getApiBase() + `/api/coach/follow/${coachId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setFollowedCoaches(prev => { const s = new Set(prev); s.delete(coachId); return s; });
      } else {
        await fetch(getApiBase() + `/api/coach/follow/${coachId}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        setFollowedCoaches(prev => new Set([...prev, coachId]));
      }
    } catch {}
  };

  const fetchReviews = async (coachId: number) => {
    const res = await fetch(getApiBase() + `/api/coaching/reviews/${coachId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setCoachReviews(p => ({ ...p, [coachId]: d.reviews || [] })); }
  };

  const submitReview = async () => {
    if (!reviewingCoach || !reviewText.trim()) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch(getApiBase() + "/api/coaching/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ coachId: reviewingCoach.id, rating: reviewRating, text: reviewText }),
      });
      if (!res.ok) throw new Error();
      setReviewMsg("✅ Review submitted!");
      setReviewText(""); setReviewRating(5);
      fetchReviews(reviewingCoach.id);
      setTimeout(() => { setReviewMsg(""); setReviewingCoach(null); }, 2000);
    } catch { setReviewMsg("Failed to submit review."); }
    finally { setReviewSubmitting(false); }
  };

  const filtered = useMemo(() => {
    let result = [...coaches];
    if (query) {
      const q = query.toLowerCase();
      if (searchField === "name") {
        result = result.filter(c => c.name.toLowerCase().includes(q));
      } else if (searchField === "plan") {
        result = result.filter(c => (c.plan_types || "").toLowerCase().includes(q));
      } else if (searchField === "monthly") {
        const target = Number(q);
        if (!Number.isNaN(target)) {
          result = result.filter(c => Number(c.monthly_price || 0) === target);
        }
      }
    }
    if (specialty !== "All") result = result.filter(c => c.specialty === specialty);
    if (location !== "All Locations") result = result.filter(c => c.location === location);
    if (planTypeFilter !== "all") result = result.filter(c => (c.plan_types || "complete") === planTypeFilter);
    const minMonthly = Number(monthlyMin);
    const maxMonthly = Number(monthlyMax);
    if (monthlyMin !== "" && !Number.isNaN(minMonthly)) {
      result = result.filter(c => Number(c.monthly_price || 0) >= minMonthly);
    }
    if (monthlyMax !== "" && !Number.isNaN(maxMonthly)) {
      result = result.filter(c => Number(c.monthly_price || 0) <= maxMonthly);
    }
    if (availableOnly) result = result.filter(c => c.available);
    result.sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "monthly_asc") return (a.monthly_price || 0) - (b.monthly_price || 0);
      if (sortBy === "monthly_desc") return (b.monthly_price || 0) - (a.monthly_price || 0);
      if (sortBy === "sessions") return b.sessions_count - a.sessions_count;
      return 0;
    });
    return result;
  }, [coaches, query, searchField, specialty, location, planTypeFilter, monthlyMin, monthlyMax, sortBy, availableOnly]);

  const activeFilters = [
    specialty !== "All",
    location !== "All Locations",
    availableOnly,
    planTypeFilter !== "all",
    monthlyMin !== "",
    monthlyMax !== "",
  ].filter(Boolean).length;

  if (!user?.isPremium) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Lock size={28} color="var(--text-muted)" />
        </div>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 10 }}>Personal Coaching</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 380, lineHeight: 1.7, marginBottom: 24 }}>Upgrade to Premium to get 1-on-1 sessions with certified coaches.</p>
        <Link to="/app/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 11, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Upgrade to Premium</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "16px 12px 28px" : "24px 20px 40px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700 }}>Find Your Coach</h1>
      </div>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="input-base"
          placeholder={searchField === "name" ? "Search by coach name..." : searchField === "plan" ? "Search by plan type (complete/workout/nutrition)..." : "Search exact monthly cost (EGP)..."}
          style={{ paddingLeft: 46, paddingRight: isMobile ? 100 : 140, fontSize: 14 }}
        />
        <button onClick={() => setShowFilters(!showFilters)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: isMobile ? 4 : 6, padding: isMobile ? "7px 10px" : "7px 14px", borderRadius: 8, background: showFilters ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${showFilters ? "var(--accent)" : "var(--border)"}`, color: showFilters ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
          <SlidersHorizontal size={13} /> Filters {activeFilters > 0 && <span style={{ width: 17, height: 17, borderRadius: "50%", background: "var(--accent)", color: "#0A0A0B", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilters}</span>}
        </button>
      </div>

      {showFilters && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: isMobile ? "12px" : "16px 20px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: isMobile ? 10 : 16, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 180px", minWidth: isMobile ? "100%" : 180 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Search In</label>
            <select className="input-base" value={searchField} onChange={e => setSearchField(e.target.value as "name" | "plan" | "monthly")}>
              <option value="name">Name</option>
              <option value="plan">Plan Type</option>
              <option value="monthly">Cost Per Month</option>
            </select>
          </div>
          <div style={{ flex: "1 1 180px", minWidth: isMobile ? "100%" : 180 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Specialty</label>
            <select className="input-base" value={specialty} onChange={e => setSpecialty(e.target.value)}>{specialties.map(s => <option key={s}>{s}</option>)}</select>
          </div>
          <div style={{ flex: "1 1 160px", minWidth: isMobile ? "100%" : 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Location</label>
            <select className="input-base" value={location} onChange={e => setLocation(e.target.value)}>{locations.map(l => <option key={l}>{l}</option>)}</select>
          </div>
          <div style={{ flex: "1 1 160px", minWidth: isMobile ? "100%" : 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Plan Type</label>
            <select className="input-base" value={planTypeFilter} onChange={e => setPlanTypeFilter(e.target.value as "all" | "complete" | "nutrition" | "workout")}>
              <option value="all">All Plans</option>
              <option value="complete">Complete</option>
              <option value="workout">Workout</option>
              <option value="nutrition">Nutrition</option>
            </select>
          </div>
          <div style={{ flex: "1 1 160px", minWidth: isMobile ? "100%" : 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly Min (EGP)</label>
            <input type="number" min="0" className="input-base" value={monthlyMin} onChange={e => setMonthlyMin(e.target.value)} placeholder="0" />
          </div>
          <div style={{ flex: "1 1 160px", minWidth: isMobile ? "100%" : 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly Max (EGP)</label>
            <input type="number" min="0" className="input-base" value={monthlyMax} onChange={e => setMonthlyMax(e.target.value)} placeholder="Any" />
          </div>
          <div style={{ flex: "1 1 160px", minWidth: isMobile ? "100%" : 160 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Sort By</label>
            <select className="input-base" value={sortBy} onChange={e => setSortBy(e.target.value)}>{sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </div>
          <div style={{ display: "flex", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", gap: 10, paddingBottom: 2, width: isMobile ? "100%" : "auto" }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={availableOnly} onChange={e => setAvailableOnly(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)", cursor: "pointer" }} /> Available only
            </label>
            {activeFilters > 0 && <button onClick={() => { setSpecialty("All"); setLocation("All Locations"); setPlanTypeFilter("all"); setMonthlyMin(""); setMonthlyMax(""); setSortBy("rating"); setAvailableOnly(false); }} style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.2)", color: "var(--red)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Clear</button>}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{filtered.length === coaches.length ? `${coaches.length} coaches available` : `${filtered.length} of ${coaches.length} coaches`}</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", "Strength & Conditioning", "HIIT & Weight Loss", "Yoga & Mobility"].map(s => (
            <button key={s} onClick={() => setSpecialty(s)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: specialty === s ? 600 : 400, cursor: "pointer", border: `1px solid ${specialty === s ? "var(--accent)" : "var(--border)"}`, background: specialty === s ? "var(--accent-dim)" : "transparent", color: specialty === s ? "var(--accent)" : "var(--text-muted)", transition: "all 0.15s" }}>{s === "All" ? "All" : s.split(" ")[0]}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading coaches...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16 }}>
          <Search size={40} strokeWidth={1} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {coaches.length === 0 ? "No coaches registered yet" : "No coaches found"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {coaches.length === 0 ? "No coaches have been approved yet." : "No coaches match your filters — try clearing them"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(290px, 1fr))", gap: 16, marginBottom: 32 }}>
          {filtered.map((c) => (
            <div key={c.id} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px", transition: "border-color 0.15s" }}>
              <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                <img src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.email}`} alt={c.name} style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "var(--bg-surface)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{c.name}</h3>
                      <p style={{ fontSize: 12, color: "var(--accent)", marginTop: 2 }}>{c.specialty || "General Fitness"}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13, color: "var(--amber)", fontWeight: 700 }}>
                      <Star size={13} style={{ fill: "var(--amber)" }} /> {Number(c.rating).toFixed(1)}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, backgroundColor: c.available ? "rgba(200,255,0,0.1)" : "var(--bg-surface)", color: c.available ? "var(--accent)" : "var(--text-muted)", border: `1px solid ${c.available ? "rgba(200,255,0,0.2)" : "var(--border)"}` }}>
                      {c.available ? "● Available" : "○ Unavailable"}
                    </span>
                    {c.location && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.location}</span>}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>{c.bio || "No bio yet."}</p>
              {/* Plan type + pricing */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "rgba(59,130,246,0.1)", color: "var(--blue)", border: "1px solid rgba(59,130,246,0.2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {c.plan_types === "workout" ? "💪 Workout" : c.plan_types === "nutrition" ? "🥗 Nutrition" : "🏆 Complete"}
                </span>
                {(c.monthly_price || 0) > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "rgba(200,255,0,0.08)", color: "var(--accent)", border: "1px solid rgba(200,255,0,0.2)", fontWeight: 600 }}>{c.monthly_price} EGP/mo</span>}
                {(c.yearly_price || 0) > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "rgba(6,182,212,0.08)", color: "var(--cyan)", border: "1px solid rgba(6,182,212,0.2)", fontWeight: 600 }}>{c.yearly_price} EGP/yr</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.review_count} review{c.review_count !== 1 ? "s" : ""}</span>
              </div>
              {/* Subscription status */}
              {subscribedCoaches[c.id]?.latestStatus && (
                <div style={{ padding: "8px 12px", marginBottom: 10, borderRadius: 10, background: subscribedCoaches[c.id].latestStatus === "active" ? "rgba(200,255,0,0.06)" : subscribedCoaches[c.id].latestStatus === "pending_admin" || subscribedCoaches[c.id].latestStatus === "pending_coach" ? "rgba(255,179,64,0.08)" : "rgba(255,68,68,0.08)", border: `1px solid ${subscribedCoaches[c.id].latestStatus === "active" ? "rgba(200,255,0,0.2)" : subscribedCoaches[c.id].latestStatus === "pending_admin" || subscribedCoaches[c.id].latestStatus === "pending_coach" ? "rgba(255,179,64,0.25)" : "rgba(255,68,68,0.22)"}` }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: subscribedCoaches[c.id].latestStatus === "active" ? "var(--accent)" : subscribedCoaches[c.id].latestStatus === "pending_admin" || subscribedCoaches[c.id].latestStatus === "pending_coach" ? "var(--amber)" : "var(--red)" }}>
                    {subscribedCoaches[c.id].latestStatus === "active"
                      ? `✓ Subscribed · Expires ${subscribedCoaches[c.id].subscription?.expires_at ? new Date(subscribedCoaches[c.id].subscription.expires_at).toLocaleDateString() : "-"}`
                      : subscribedCoaches[c.id].latestStatus === "pending_admin"
                        ? "⏳ Payment pending admin verification"
                        : subscribedCoaches[c.id].latestStatus === "pending_coach"
                          ? "⏳ Waiting for coach decision"
                          : subscribedCoaches[c.id].latestStatus === "rejected_by_coach"
                            ? "✗ Declined by coach · Refunded"
                            : subscribedCoaches[c.id].latestStatus === "rejected_admin"
                              ? "✗ Rejected by admin · Refunded"
                              : "✗ Subscription request closed"}
                  </p>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => navigate(`/app/chat?coach=${c.id}`)} style={{ flex: isMobile ? "1 1 48%" : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, backgroundColor: subscribedCoaches[c.id]?.subscribed ? "var(--accent-dim)" : "var(--bg-surface)", border: `1px solid ${subscribedCoaches[c.id]?.subscribed ? "rgba(200,255,0,0.2)" : "var(--border)"}`, color: subscribedCoaches[c.id]?.subscribed ? "var(--accent)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <MessageSquare size={14} /> Chat
                </button>
                {(c.monthly_price || c.yearly_price) ? (
                  subscribedCoaches[c.id]?.canRequestNew === false && !subscribedCoaches[c.id]?.subscribed ? (
                    <button disabled style={{ flex: isMobile ? "1 1 48%" : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, backgroundColor: "rgba(255,179,64,0.08)", border: "1px solid rgba(255,179,64,0.25)", color: "var(--amber)", fontSize: 12, fontWeight: 700, cursor: "not-allowed", opacity: 0.85 }}>
                      Pending
                    </button>
                  ) : !subscribedCoaches[c.id]?.subscribed ? (
                    <button onClick={() => { if (!c.available) return; setSubscribeCoach(c); setSubCycle("monthly"); setSubMsg(""); }} disabled={!c.available} style={{ flex: isMobile ? "1 1 48%" : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, backgroundColor: "var(--accent)", border: "none", color: "#0A0A0B", fontSize: 13, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", cursor: c.available ? "pointer" : "not-allowed", opacity: c.available ? 1 : 0.6 }}>
                      Subscribe
                    </button>
                  ) : (
                    <button onClick={() => { if (!c.available) return; setBookingCoach(c); setBookingDate(""); setBookingTime(""); setBookingNote(""); setBookingMsg(""); }} disabled={!c.available} style={{ flex: isMobile ? "1 1 48%" : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: c.available ? "var(--text-primary)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: c.available ? "pointer" : "not-allowed", opacity: c.available ? 1 : 0.6 }}>
                      <Calendar size={14} /> Book
                    </button>
                  )
                ) : (
                  <button onClick={() => { if (!c.available) return; setBookingCoach(c); setBookingDate(""); setBookingTime(""); setBookingNote(""); setBookingMsg(""); }} disabled={!c.available} style={{ flex: isMobile ? "1 1 48%" : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: c.available ? "var(--text-primary)" : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: c.available ? "pointer" : "not-allowed", opacity: c.available ? 1 : 0.6 }}>
                    <Calendar size={14} /> Book
                  </button>
                )}
                <button onClick={() => { setReviewingCoach(c); setReviewRating(5); setReviewText(""); setReviewMsg(""); fetchReviews(c.id); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 12px", borderRadius: 9, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--amber)", cursor: "pointer", flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto" }}>
                  <Star size={14} />
                </button>
                {subscribedCoaches[c.id] && (
                  <button onClick={() => { setGiftCoach(c); setGiftAmount("50"); setGiftMessage(""); setGiftMsg(""); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 12px", borderRadius: 9, backgroundColor: "rgba(200,255,0,0.06)", border: "1px solid rgba(200,255,0,0.2)", color: "var(--accent)", cursor: "pointer", flex: isMobile ? "1 1 calc(50% - 4px)" : "0 0 auto" }} title="Send Gift">
                    <Gift size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {bookingCoach && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 8 : 20, backgroundColor: "rgba(0,0,0,0.7)", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 480, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: isMobile ? 16 : 20, padding: isMobile ? "16px" : "24px", margin: "auto", maxHeight: "90dvh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={bookingCoach.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bookingCoach.email}`} alt={bookingCoach.name} style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--bg-card)" }} />
                <div>
                  <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Book with {bookingCoach.name}</h4>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{bookingCoach.specialty}</p>
                </div>
              </div>
              <button onClick={() => setBookingCoach(null)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", padding: "10px 14px", background: "var(--accent-dim)", borderRadius: 10, border: "1px solid rgba(200,255,0,0.2)" }}>📆 Monthly Plan — <strong style={{ color: "var(--accent)" }}>{bookingCoach.monthly_price || 0} EGP/month</strong></p>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Plan</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {([{ id: "complete", label: "🏆 Complete Plan", desc: "Workout + Nutrition" }, { id: "workout", label: "💪 Workout Only", desc: "Strength & conditioning" }, { id: "nutrition", label: "🥗 Nutrition Only", desc: "Personalized meals" }] as const).map(plan => (
                    <button key={plan.id} onClick={() => setBookingPlan(plan.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, border: `1px solid ${bookingPlan === plan.id ? "var(--accent)" : "var(--border)"}`, background: bookingPlan === plan.id ? "var(--accent-dim)" : "var(--bg-card)", cursor: "pointer", textAlign: "left" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: bookingPlan === plan.id ? "var(--accent)" : "var(--text-primary)" }}>{plan.label}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{plan.desc}</p>
                      </div>
                      {bookingPlan === plan.id && <span style={{ color: "var(--accent)" }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Note for Coach</label>
                <textarea value={bookingNote} onChange={(e) => setBookingNote(e.target.value)} className="input-base" placeholder="Goals, injuries, preferences…" rows={2} style={{ resize: "none" }} />
              </div>
              {/* Body Photos */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Body Photos (Optional)</label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "Now Body", preview: nowBodyPreview, setter: setNowBodyPhoto, previewSetter: setNowBodyPreview },
                    { label: "Dream Body", preview: dreamBodyPreview, setter: setDreamBodyPhoto, previewSetter: setDreamBodyPreview },
                  ].map((p) => (
                    <label key={p.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, height: 100, borderRadius: 12, border: "2px dashed var(--border)", backgroundColor: "var(--bg-card)", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                      {p.preview ? (
                        <img src={p.preview} alt={p.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <>
                          <Camera size={20} color="var(--text-muted)" />
                          <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.3 }}>{p.label}</span>
                        </>
                      )}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { p.setter(file); const url = URL.createObjectURL(file); p.previewSetter(url); }
                      }} />
                    </label>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Help your coach understand your current physique and goals</p>
              </div>

              <div style={{ padding: "12px 16px", backgroundColor: "var(--bg-card)", borderRadius: 10, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Monthly · {bookingPlan}</p>
                <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{bookingCoach.monthly_price || 0} EGP</p>
              </div>
              {bookingMsg && <div style={{ padding: "10px 14px", backgroundColor: bookingMsg.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${bookingMsg.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 9, fontSize: 13, color: bookingMsg.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{bookingMsg}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 4, flexDirection: isMobile ? "column" : "row" }}>
                <button onClick={() => setBookingCoach(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
                <button onClick={async () => {
                  try {
                    const fd = new FormData();
                    fd.append("coachId", String(bookingCoach.id));
                    fd.append("date", bookingDate);
                    fd.append("time", bookingTime);
                    fd.append("note", bookingNote);
                    fd.append("bookingType", bookingType);
                    fd.append("plan", bookingPlan);
                    fd.append("level", bookingLevel);
                    if (nowBodyPhoto) fd.append("nowBodyPhoto", nowBodyPhoto);
                    if (dreamBodyPhoto) fd.append("dreamBodyPhoto", dreamBodyPhoto);
                    const r = await fetch(getApiBase() + "/api/coaching/book", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
                    if (!r.ok) throw new Error();
                    setBookingMsg("✅ Booking requested! The coach will confirm shortly.");
                    setTimeout(() => setBookingCoach(null), 2000);
                  } catch { setBookingMsg("❌ Booking failed. Please try again."); }
                }} style={{ flex: 2, padding: "11px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {subscribeCoach && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 8 : 20, backgroundColor: "rgba(0,0,0,0.7)", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 480, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: isMobile ? 16 : 20, padding: isMobile ? "16px" : "24px", margin: "auto", maxHeight: "90dvh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={subscribeCoach.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${subscribeCoach.email}`} alt={subscribeCoach.name} style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--bg-card)" }} />
                <div>
                  <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Subscribe to {subscribeCoach.name}</h4>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{subscribeCoach.specialty}</p>
                </div>
              </div>
              <button onClick={() => setSubscribeCoach(null)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Plan type display */}
              <div style={{ padding: "12px 16px", backgroundColor: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Plan Includes</p>
                <p style={{ fontSize: 14, fontWeight: 600 }}>
                  {subscribeCoach.plan_types === "workout" ? "💪 Workout Only" : subscribeCoach.plan_types === "nutrition" ? "🥗 Nutrition Only" : "🏆 Complete Plan (Workout + Nutrition)"}
                </p>
              </div>

              {/* Billing cycle */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Billing Cycle</label>
                <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
                  {(subscribeCoach.monthly_price || 0) > 0 && (
                    <button onClick={() => setSubCycle("monthly")} style={{ flex: 1, padding: "14px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: `2px solid ${subCycle === "monthly" ? "var(--accent)" : "var(--border)"}`, background: subCycle === "monthly" ? "var(--accent-dim)" : "var(--bg-card)", color: subCycle === "monthly" ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", textAlign: "center" }}>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{subscribeCoach.monthly_price} <span style={{ fontSize: 12 }}>EGP</span></p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Monthly</p>
                    </button>
                  )}
                  {(subscribeCoach.yearly_price || 0) > 0 && (
                    <button onClick={() => setSubCycle("yearly")} style={{ flex: 1, padding: "14px 12px", borderRadius: 12, fontSize: 13, fontWeight: 600, border: `2px solid ${subCycle === "yearly" ? "var(--accent)" : "var(--border)"}`, background: subCycle === "yearly" ? "var(--accent-dim)" : "var(--bg-card)", color: subCycle === "yearly" ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer", textAlign: "center", position: "relative" }}>
                      {(subscribeCoach.monthly_price || 0) > 0 && (subscribeCoach.yearly_price || 0) < (subscribeCoach.monthly_price || 0) * 12 && (
                        <span style={{ position: "absolute", top: -8, right: 8, fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "var(--accent)", color: "#0A0A0B", fontWeight: 700 }}>
                          Save {Math.round(100 - ((subscribeCoach.yearly_price || 0) / ((subscribeCoach.monthly_price || 0) * 12)) * 100)}%
                        </span>
                      )}
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{subscribeCoach.yearly_price} <span style={{ fontSize: 12 }}>EGP</span></p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Yearly</p>
                    </button>
                  )}
                </div>
              </div>

              {/* PaymentForm with all methods (PayPal, E-Wallet, IAP) */}
              <PaymentForm
                amount={subCycle === "monthly" ? (subscribeCoach.monthly_price || 50) : (subscribeCoach.yearly_price || 450)}
                plan={subCycle === "monthly" ? "monthly" : "annual"}
                type="user"
                token={token}
                coachId={subscribeCoach.id}
                coachName={subscribeCoach.name}
                onSuccess={() => {
                  setSubMsg("✅ Request sent. Waiting for admin verification then coach decision.");
                  setSubscribedCoaches(prev => ({ ...prev, [subscribeCoach.id]: { ...(prev[subscribeCoach.id] || {}), subscribed: false, latestStatus: "pending_admin", canRequestNew: false } }));
                  setTimeout(() => { setSubscribeCoach(null); setSubMsg(""); }, 2000);
                }}
                onError={(msg) => setSubMsg(msg || "Payment failed")}
              />

              {subMsg && <div style={{ padding: "10px 14px", backgroundColor: subMsg.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${subMsg.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 9, fontSize: 13, color: subMsg.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{subMsg}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingCoach && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 8 : 20, backgroundColor: "rgba(0,0,0,0.7)", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 460, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: isMobile ? 16 : 20, padding: isMobile ? "16px" : "24px", margin: "auto", maxHeight: "90dvh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={reviewingCoach.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewingCoach.email}`} alt={reviewingCoach.name} style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--bg-card)" }} />
                <div>
                  <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Review {reviewingCoach.name}</h4>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{reviewingCoach.specialty}</p>
                </div>
              </div>
              <button onClick={() => setReviewingCoach(null)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Your Rating</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setReviewRating(r)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      <Star size={28} color="var(--amber)" style={{ fill: r <= reviewRating ? "var(--amber)" : "transparent", transition: "fill 0.1s" }} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Your Review</label>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience with this coach…" rows={4} className="input-base" style={{ resize: "none" }} />
              </div>
              {(coachReviews[reviewingCoach.id] || []).length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Recent Reviews</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                    {(coachReviews[reviewingCoach.id] || []).map((rv: any, i: number) => (
                      <div key={i} style={{ backgroundColor: "var(--bg-card)", borderRadius: 10, padding: "10px 14px", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(s => <Star key={s} size={11} color="var(--amber)" style={{ fill: s <= rv.rating ? "var(--amber)" : "transparent" }} />)}</div>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{rv.userName || "User"}</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{rv.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {reviewMsg && <div style={{ padding: "10px 14px", backgroundColor: reviewMsg.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${reviewMsg.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 9, fontSize: 13, color: reviewMsg.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{reviewMsg}</div>}
              <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                <button onClick={() => setReviewingCoach(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
                <button onClick={submitReview} disabled={reviewSubmitting || !reviewText.trim()} style={{ flex: 2, padding: "11px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: reviewSubmitting || !reviewText.trim() ? "not-allowed" : "pointer", opacity: reviewSubmitting || !reviewText.trim() ? 0.6 : 1 }}>
                  {reviewSubmitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {giftCoach && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? 8 : 20, backgroundColor: "rgba(0,0,0,0.7)", overflowY: "auto" }}>
          <div style={{ width: "100%", maxWidth: 400, backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: isMobile ? 16 : 20, padding: isMobile ? "16px" : "24px", margin: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, rgba(200,255,0,0.15), rgba(200,255,0,0.05))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎁</div>
                <div>
                  <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Send Gift</h4>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>to {giftCoach.name}</p>
                </div>
              </div>
              <button onClick={() => setGiftCoach(null)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Points Amount</label>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 8 }}>
                  {["25", "50", "100", "200"].map(a => (
                    <button key={a} onClick={() => setGiftAmount(a)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", border: `2px solid ${giftAmount === a ? "var(--accent)" : "var(--border)"}`, background: giftAmount === a ? "var(--accent-dim)" : "var(--bg-card)", color: giftAmount === a ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer" }}>
                      {a}
                    </button>
                  ))}
                </div>
                <input type="number" value={giftAmount} onChange={e => setGiftAmount(e.target.value)} className="input-base" placeholder="Custom amount" min="1" style={{ marginTop: 8 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Message (Optional)</label>
                <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value)} className="input-base" placeholder="Say something nice…" rows={2} style={{ resize: "none" }} />
              </div>
              {giftMsg && <div style={{ padding: "10px 14px", backgroundColor: giftMsg.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${giftMsg.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 9, fontSize: 13, color: giftMsg.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{giftMsg}</div>}
              <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                <button onClick={() => setGiftCoach(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}>Cancel</button>
                <button onClick={sendGift} disabled={giftSending} style={{ flex: 2, padding: "11px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 14, border: "none", cursor: giftSending ? "not-allowed" : "pointer", opacity: giftSending ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Gift size={15} /> {giftSending ? "Sending…" : `Send ${giftAmount} Points`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
