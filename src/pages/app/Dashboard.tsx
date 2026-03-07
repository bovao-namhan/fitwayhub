import { getApiBase } from "@/lib/api";
import { StatCard } from "@/components/app/StatCard";
import { Activity, Flame, Droplets, Footprints, PlayCircle, ArrowRight, Zap, Megaphone, ExternalLink, Target, Edit2, Check, X, ChevronDown, ChevronUp, Utensils, Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/context/I18nContext";

export default function Dashboard() {
  const { user, token, updateUser, refreshUser } = useAuth();
  const [steps, setSteps] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [myPlan, setMyPlan] = useState<any>(null);
  const [ads, setAds] = useState<any[]>([]);
  const [homeBannerAds, setHomeBannerAds] = useState<any[]>([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const [hasCoach, setHasCoach] = useState(false);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [showAllMeals, setShowAllMeals] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  const firstName = user?.name?.split(" ")[0] || "Athlete";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    if (token) {
      const today = new Date().toISOString().split("T")[0];
      fetch(getApiBase() + `/api/steps/${today}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const todaySteps = d.entry?.steps || 0;
          if (todaySteps > 0) { setSteps(todaySteps); updateUser({ steps: todaySteps }); }
        })
        .catch(() => {});
      fetch(getApiBase() + "/api/workouts/my-plan", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setMyPlan(d))
        .catch(() => setMyPlan(null));
      fetch(getApiBase() + "/api/coach/ads/public", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const fetchedAds = d.ads || [];
          setAds(fetchedAds);
          // Track impressions for all visible ads
          if (fetchedAds.length > 0) {
            fetch(getApiBase() + "/api/coach/ads/impressions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ids: fetchedAds.map((a: any) => a.id) }) }).catch(() => {});
          }
        })
        .catch(() => {});
      fetch(getApiBase() + "/api/coach/ads/public/home", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          const hAds = d.ads || [];
          setHomeBannerAds(hAds);
          if (hAds.length > 0) {
            fetch(getApiBase() + "/api/coach/ads/impressions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ids: hAds.map((a: any) => a.id) }) }).catch(() => {});
          }
        })
        .catch(() => {});
      // Check if user has an active coach
      fetch(getApiBase() + "/api/coaching/my-coach", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setHasCoach(!!d?.coach))
        .catch(() => setHasCoach(false));
    }
  }, [token]);

  // Auto-rotate home banner carousel every 5s
  useEffect(() => {
    if (homeBannerAds.length <= 1) return;
    const interval = setInterval(() => setBannerIndex((i) => (i + 1) % homeBannerAds.length), 5000);
    return () => clearInterval(interval);
  }, [homeBannerAds.length]);

  const handleSyncSteps = async () => {
    setIsSyncing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(getApiBase() + `/api/steps/${today}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.entry?.steps) {
        setSteps(data.entry.steps);
        updateUser({ steps: data.entry.steps });
        analyzeSteps(data.entry.steps);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const analyzeSteps = async (currentSteps: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiBase() + "/api/ai/analyze-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ steps: currentSteps }),
      });
      setAiAnalysis(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  const stepsGoal = user?.stepGoal || 10000;
  const stepsPercent = Math.min(100, Math.round((steps / stepsGoal) * 100));

  const saveStepGoal = async () => {
    const val = parseInt(goalInput);
    if (!val || val < 100) return;
    setGoalSaving(true);
    try {
      const res = await fetch(getApiBase() + "/api/user/step-goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ step_goal: val }),
      });
      if (res.ok) {
        updateUser({ stepGoal: val } as any);
        await refreshUser();
        setEditingGoal(false);
      } else {
        const d = await res.json();
        alert(d.message || "Cannot update goal");
      }
    } finally { setGoalSaving(false); }
  };

  // Get today's day name for workout plan
  const todayDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
  const todayExercises = (myPlan?.workout?.sessions || []).filter((e: any) => !e.day || e.day === todayDay || e.day === "All");
  const allExercises = myPlan?.workout?.sessions || [];
  const displayExercises = showAllExercises ? allExercises : (todayExercises.length > 0 ? todayExercises : allExercises).slice(0, 3);

  // Get meals for today
  const meals = myPlan?.nutrition?.meals || [];
  const displayMeals = showAllMeals ? meals : meals.slice(0, 3);

  return (
    <div style={{ padding: isMobile ? "16px 12px 32px" : "20px 16px 32px", maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div className="fade-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: isMobile ? 20 : 32 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 4 }}>
            {greeting}
          </p>
          <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: isMobile ? 24 : 30, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
            {firstName}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 4 }}>
            {t("ready_goals") || "Ready to crush today's goals?"}
          </p>
        </div>
        <img
          src={user?.avatar}
          alt="Avatar"
          style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid var(--border-light)", objectFit: "cover" }}
        />
      </div>

      {/* ── Stats ── */}
      <div className="fade-up-1" style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard title={t("stat_steps") || "Steps"} value={steps.toLocaleString()} unit={`/ ${stepsGoal.toLocaleString()}`} icon={Footprints} color="accent" trend={`${stepsPercent}% of goal`} />
        <StatCard title={t("stat_calories") || "Calories"} value={Math.floor(steps * 0.04).toLocaleString()} unit="kcal" icon={Flame} color="red" />
        <StatCard title={t("stat_water") || "Water"} value="1.2" unit="L" icon={Droplets} color="blue" />
        <StatCard title={t("stat_activity") || "Active"} value={Math.floor(steps / 100).toString()} unit="min" icon={Activity} color="amber" />
      </div>

      {/* ── Progress bar ── */}
      <div className="card fade-up-2" style={{ padding: "16px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Daily Step Goal</span>
            {hasCoach && (
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(59,139,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,139,255,0.2)", fontWeight: 600 }}>SET BY COACH</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!hasCoach && !editingGoal && (
              <button onClick={() => { setGoalInput(String(stepsGoal)); setEditingGoal(true); }} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 8px", cursor: "pointer" }}>
                <Edit2 size={11} /> Edit
              </button>
            )}
            {editingGoal && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value.replace(/\D/g, ""))}
                  style={{ width: 80, padding: "4px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 13, fontFamily: "'Chakra Petch', sans-serif", outline: "none" }}
                  onKeyDown={e => { if (e.key === "Enter") saveStepGoal(); if (e.key === "Escape") setEditingGoal(false); }}
                  autoFocus
                />
                <button onClick={saveStepGoal} disabled={goalSaving} style={{ width: 26, height: 26, borderRadius: 6, background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={13} color="#0A0A0B" />
                </button>
                <button onClick={() => setEditingGoal(false)} style={{ width: 26, height: 26, borderRadius: 6, background: "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={13} color="var(--text-muted)" />
                </button>
              </div>
            )}
            <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, color: "var(--accent)", fontWeight: 700 }}>
              {stepsPercent}%
            </span>
          </div>
        </div>
        <div style={{ height: 6, backgroundColor: "var(--bg-surface)", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${stepsPercent}%`,
              backgroundColor: "var(--accent)",
              borderRadius: 4,
              transition: "width 1s ease",
              boxShadow: "0 0 8px var(--accent-glow)",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{steps.toLocaleString()} steps taken</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Goal: {stepsGoal.toLocaleString()} · {(stepsGoal - steps > 0 ? stepsGoal - steps : 0).toLocaleString()} remaining</span>
        </div>
      </div>

      {/* ── Today's plan ── */}
      <div className="fade-up-3" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>
            {t("todays_plan_title") || "Today's Plan"}
          </h2>
          <Link
            to="/app/workouts"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
          >
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {!myPlan ? (
          <div className="card" style={{ padding: "24px", textAlign: "center" }}>
            <Dumbbell size={32} style={{ margin: "0 auto 12px", color: "var(--text-muted)" }} strokeWidth={1} />
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No Plan Yet</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              {hasCoach ? "Your coach hasn't assigned a plan yet." : "Find a coach or browse workouts to get started."}
            </p>
            <Link to="/app/coaching" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Find a Coach
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Workout plan */}
            {myPlan.workout && (
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Dumbbell size={16} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{myPlan.workout.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                      {allExercises.length} exercises · {todayDay}'s workout
                    </p>
                  </div>
                  <button
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", flexShrink: 0 }}
                  >
                    <PlayCircle size={15} /> Start
                  </button>
                </div>
                {displayExercises.length > 0 ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {displayExercises.map((ex: any, i: number) => (
                        <div key={ex.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(200,255,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</p>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                              {ex.sets} sets × {ex.reps} reps{ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}{ex.day && ex.day !== "All" ? ` · ${ex.day}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(todayExercises.length > 3 || allExercises.length > 3) && (
                      <button onClick={() => setShowAllExercises(s => !s)} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                        {showAllExercises ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {allExercises.length} exercises</>}
                      </button>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No exercises scheduled for today</p>
                )}
              </div>
            )}

            {/* Nutrition / Meals */}
            {myPlan.nutrition && (
              <div className="card" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Utensils size={16} color="var(--red)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700 }}>{myPlan.nutrition.title}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                      {myPlan.nutrition.dailyCalories} kcal · {myPlan.nutrition.protein}g protein · {myPlan.nutrition.carbs}g carbs · {myPlan.nutrition.fat}g fat
                    </p>
                  </div>
                </div>
                {meals.length > 0 ? (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {displayMeals.map((meal: any, i: number) => (
                        <div key={meal.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                          <div style={{ flexShrink: 0, textAlign: "center", minWidth: 52 }}>
                            {meal.time ? (
                              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--red)" }}>{meal.time}</p>
                            ) : (
                              <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(255,107,53,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                                <Utensils size={13} color="var(--red)" />
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meal.name}</p>
                            {meal.foods && <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meal.foods}</p>}
                          </div>
                          {meal.calories > 0 && (
                            <span style={{ fontSize: 11, fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, color: "var(--amber)", flexShrink: 0 }}>{meal.calories} kcal</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {meals.length > 3 && (
                      <button onClick={() => setShowAllMeals(s => !s)} style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 12, color: "var(--red)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                        {showAllMeals ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Show all {meals.length} meals</>}
                      </button>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No meals scheduled yet</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Tools ── */}
      <div className="fade-up-4">
        <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
          {t("quick_tools") || "Quick Tools"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fit, minmax(min(130px, 100%), 1fr))" : "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
          {[
            { label: t("tool_bmi_calc") || "BMI Calc",    icon: Activity,   to: "/app/tools",  color: "var(--blue)" },
            { label: t("tool_macros") || "Macros",        icon: Flame,      to: "/app/tools",  color: "var(--red)" },
            { label: t("tool_steps") || "Step Sync",      icon: Footprints, to: "/app/steps",  color: "var(--accent)" },
            { label: t("tool_water") || "Water Log",      icon: Droplets,   to: "/app/tools",  color: "var(--cyan)" },
          ].map((tool, i) => (
            <Link
              key={i}
              to={tool.to}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: "16px",
                borderRadius: 14,
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                textDecoration: "none",
                transition: "border-color 0.15s, transform 0.15s",
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = tool.color;
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: `${tool.color}18` }}>
                <tool.icon size={17} color={tool.color} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{tool.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Home Banner Ad Carousel ── */}
      {homeBannerAds.length > 0 && (() => {
        const ad = homeBannerAds[bannerIndex % homeBannerAds.length];
        const ctaLink = ad.objective === "coaching"
          ? `/app/coaching?coach=${ad.coach_id}`
          : `/app/coaching?coach=${ad.coach_id}`;
        return (
          <div key={ad.id} className="fade-up-4" style={{ marginTop: 16, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(59,139,255,0.25)", backgroundColor: "var(--bg-card)", position: "relative" }}>
            {/* Sponsored badge */}
            <div style={{ position: "absolute", top: 8, insetInlineStart: 10, zIndex: 2, backgroundColor: "rgba(59,139,255,0.85)", borderRadius: 20, padding: "2px 9px", fontSize: 9, fontWeight: 700, color: "#fff", fontFamily: "'Chakra Petch', sans-serif", letterSpacing: "0.06em" }}>SPONSORED</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
              {ad.image_url && (
                <div style={{ width: 64, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  <img src={ad.image_url} alt={ad.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              {ad.video_url && ad.media_type === "video" && !ad.image_url && (
                <div style={{ width: 64, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  <video src={ad.video_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.title}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ad.coach_name} · {ad.specialty}</p>
              </div>
              <Link to={ctaLink} onClick={() => fetch(getApiBase() + `/api/coach/ads/${ad.id}/click`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {})} style={{ padding: "6px 12px", borderRadius: 8, backgroundColor: "var(--blue)", color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", textDecoration: "none", flexShrink: 0 }}>
                {ad.cta || "Learn More"}
              </Link>
            </div>
            {/* Carousel dots */}
            {homeBannerAds.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 5, paddingBottom: 8 }}>
                {homeBannerAds.map((_: any, i: number) => (
                  <button key={i} onClick={() => setBannerIndex(i)} style={{ width: i === bannerIndex % homeBannerAds.length ? 16 : 6, height: 6, borderRadius: 3, border: "none", cursor: "pointer", backgroundColor: i === bannerIndex % homeBannerAds.length ? "var(--blue)" : "var(--border)", transition: "all 0.2s", padding: 0 }} />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Featured Coach Ads ── */}
      {ads.length > 0 && (
        <div className="fade-up-4" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Megaphone size={15} color="var(--blue)" />
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>Featured Coaches</h2>
            </div>
            <a href="/app/coaching" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Find Coaches <ArrowRight size={13} />
            </a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {ads.slice(0, 4).map((ad: any) => (
              <div key={ad.id} style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(59,139,255,0.2)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {ad.image_url && (
                  <div style={{ height: 120, overflow: "hidden", flexShrink: 0 }}>
                    <img src={ad.image_url} alt={ad.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {ad.coach_avatar && <img src={ad.coach_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ad.coach_email}`} alt={ad.coach_name} style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, backgroundColor: "var(--bg-surface)" }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{ad.title}</p>
                      <p style={{ fontSize: 11, color: "var(--blue)", marginTop: 2 }}>{ad.coach_name}</p>
                    </div>
                  </div>
                  {ad.highlight && <span style={{ alignSelf: "flex-start", fontSize: 11, padding: "2px 8px", borderRadius: 20, backgroundColor: "rgba(59,139,255,0.1)", color: "var(--blue)", border: "1px solid rgba(59,139,255,0.2)" }}>⭐ {ad.highlight}</span>}
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>{ad.description.length > 90 ? ad.description.slice(0, 90) + "…" : ad.description}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>🎯 {ad.specialty}</p>
                  <Link to={`/app/coaching?coach=${ad.coach_id}`} onClick={() => fetch(getApiBase() + `/api/coach/ads/${ad.id}/click`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {})} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 9, backgroundColor: "var(--blue)", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif", textDecoration: "none", marginTop: 4 }}>
                    {ad.cta || "Book Now"} <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Analysis ── */}
      {aiAnalysis && (
        <div
          className="fade-up"
          style={{
            marginTop: 24,
            padding: "20px 24px",
            borderRadius: 16,
            backgroundColor: "var(--bg-card)",
            border: "1px solid rgba(200,255,0,0.25)",
            boxShadow: "0 0 30px var(--accent-glow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Zap size={18} color="var(--accent)" />
            <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--accent)" }}>
              {t("ai_performance_analysis") || "AI Performance Analysis"}
            </h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Rating</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{aiAnalysis.performance_rating}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>{aiAnalysis.health_advice}</p>
            </div>
            <div style={{ borderInlineStart: "1px solid var(--border)", paddingInlineStart: 16 }}>
              <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-secondary)", marginBottom: 12 }}>"{aiAnalysis.motivational_message}"</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tomorrow's Goal</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{aiAnalysis.tomorrow_goal?.toLocaleString()} steps</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
