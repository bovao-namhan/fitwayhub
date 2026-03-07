import { useState, useEffect, useRef } from "react";
import { Dumbbell, Utensils, Trash2, Plus, Video, Clock, Upload } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { getApiBase } from "@/lib/api";

interface WorkoutPlan {
  id: number;
  day_of_week: string;
  workout_type: string;
  video_url: string | null;
  time_minutes: number;
  notes: string | null;
}

interface NutritionPlan {
  id: number;
  day_of_week: string;
  meal_time: string;
  meal_type: string | null;
  meal_name: string;
  contents: string | null;
  calories: number;
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const WORKOUT_TYPES = ["strength", "cardio", "hiit", "yoga", "stretching", "crossfit", "pilates", "swimming", "running", "cycling", "boxing", "martial_arts", "calisthenics", "other_type"] as const;
const MEAL_TIMES = ["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"] as const;
const MEAL_TYPES = ["protein_meal", "carbs_meal", "fats_meal", "balanced", "supplement"] as const;

export default function Plans() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"workout" | "nutrition">("workout");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const token = localStorage.getItem("token");

  // Workout state
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [wDay, setWDay] = useState("");
  const [wType, setWType] = useState("");
  const [wTime, setWTime] = useState("");
  const [wNotes, setWNotes] = useState("");
  const [wVideo, setWVideo] = useState<File | null>(null);
  const [wSaving, setWSaving] = useState(false);
  const videoRef = useRef<HTMLInputElement>(null);

  // Nutrition state
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [nDay, setNDay] = useState("");
  const [nMealTime, setNMealTime] = useState("");
  const [nMealType, setNMealType] = useState("");
  const [nMealName, setNMealName] = useState("");
  const [nContents, setNContents] = useState("");
  const [nCalories, setNCalories] = useState("");
  const [nSaving, setNSaving] = useState(false);

  const [filterDay, setFilterDay] = useState<string>("all");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { fetchWorkouts(); fetchNutrition(); }, []);

  const headers = () => ({ Authorization: `Bearer ${token}` });

  async function fetchWorkouts() {
    try {
      const res = await fetch(`${getApiBase()}/api/plans/workouts`, { headers: headers() });
      const data = await res.json();
      setWorkoutPlans(data.plans || []);
    } catch { /* */ }
  }

  async function fetchNutrition() {
    try {
      const res = await fetch(`${getApiBase()}/api/plans/nutrition`, { headers: headers() });
      const data = await res.json();
      setNutritionPlans(data.plans || []);
    } catch { /* */ }
  }

  async function insertWorkout() {
    if (!wDay || !wType) return;
    setWSaving(true);
    try {
      const fd = new FormData();
      fd.append("day_of_week", wDay);
      fd.append("workout_type", wType);
      fd.append("time_minutes", wTime || "0");
      if (wNotes) fd.append("notes", wNotes);
      if (wVideo) fd.append("video", wVideo);
      await fetch(`${getApiBase()}/api/plans/workouts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      setWDay(""); setWType(""); setWTime(""); setWNotes(""); setWVideo(null);
      if (videoRef.current) videoRef.current.value = "";
      fetchWorkouts();
    } catch { /* */ }
    setWSaving(false);
  }

  async function insertNutrition() {
    if (!nDay || !nMealTime || !nMealName) return;
    setNSaving(true);
    try {
      await fetch(`${getApiBase()}/api/plans/nutrition`, {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({
          day_of_week: nDay,
          meal_time: nMealTime,
          meal_type: nMealType || null,
          meal_name: nMealName,
          contents: nContents || null,
          calories: nCalories || "0",
        }),
      });
      setNDay(""); setNMealTime(""); setNMealType(""); setNMealName(""); setNContents(""); setNCalories("");
      fetchNutrition();
    } catch { /* */ }
    setNSaving(false);
  }

  async function deleteWorkout(id: number) {
    await fetch(`${getApiBase()}/api/plans/workouts/${id}`, { method: "DELETE", headers: headers() });
    fetchWorkouts();
  }

  async function deleteNutrition(id: number) {
    await fetch(`${getApiBase()}/api/plans/nutrition/${id}`, { method: "DELETE", headers: headers() });
    fetchNutrition();
  }

  const card: React.CSSProperties = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: isMobile ? "16px 14px" : "22px 20px",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-surface)",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
  };

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
  };

  const dayLabel = (d: string) => t(`plan_${d}`) || d;
  const mealTimeLabel = (m: string) => t(m) || m;
  const mealTypeLabel = (m: string) => t(m) || m;
  const workoutTypeLabel = (w: string) => t(w) || w;

  const filteredWorkouts = filterDay === "all" ? workoutPlans : workoutPlans.filter(p => p.day_of_week === filterDay);
  const filteredNutrition = filterDay === "all" ? nutritionPlans : nutritionPlans.filter(p => p.day_of_week === filterDay);

  // Group by day
  const groupByDay = <T extends { day_of_week: string }>(items: T[]) => {
    const grouped: Record<string, T[]> = {};
    for (const item of items) {
      if (!grouped[item.day_of_week]) grouped[item.day_of_week] = [];
      grouped[item.day_of_week].push(item);
    }
    return grouped;
  };

  return (
    <div style={{ padding: isMobile ? "16px 14px" : "24px 20px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, marginBottom: 4 }}>
        {t("nav_plans")}
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>
        {tab === "workout" ? t("add_workout_subtitle") : t("add_nutrition_subtitle")}
      </p>

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, backgroundColor: "var(--bg-surface)", padding: 4, borderRadius: 12, border: "1px solid var(--border)" }}>
        <button
          onClick={() => setTab("workout")}
          style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            backgroundColor: tab === "workout" ? "var(--accent)" : "transparent",
            color: tab === "workout" ? "#0A0A0B" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          <Dumbbell size={16} /> {t("workout_plan")}
        </button>
        <button
          onClick={() => setTab("nutrition")}
          style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            backgroundColor: tab === "nutrition" ? "var(--accent)" : "transparent",
            color: tab === "nutrition" ? "#0A0A0B" : "var(--text-secondary)",
            transition: "all 0.15s",
          }}
        >
          <Utensils size={16} /> {t("nutrition_plan")}
        </button>
      </div>

      {/* ── WORKOUT TAB ── */}
      {tab === "workout" && (
        <>
          {/* Insert Form */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Plus size={18} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>{t("workout_plan")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              {/* Day */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("select_day")}</label>
                <select value={wDay} onChange={e => setWDay(e.target.value)} style={selectStyle}>
                  <option value="">{t("select_day")}...</option>
                  {DAYS.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
                </select>
              </div>
              {/* Type */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("workout_type")}</label>
                <select value={wType} onChange={e => setWType(e.target.value)} style={selectStyle}>
                  <option value="">{t("workout_type")}...</option>
                  {WORKOUT_TYPES.map(w => <option key={w} value={w}>{workoutTypeLabel(w)}</option>)}
                </select>
              </div>
              {/* Time */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("time_minutes")}</label>
                <div style={{ position: "relative" }}>
                  <Clock size={14} style={{ position: "absolute", top: 12, insetInlineStart: 12, color: "var(--text-muted)" }} />
                  <input
                    type="number"
                    value={wTime}
                    onChange={e => setWTime(e.target.value)}
                    placeholder="45"
                    style={{ ...inputStyle, paddingInlineStart: 34 }}
                    min={0}
                  />
                </div>
              </div>
              {/* Video */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("training_video")}</label>
                <div
                  onClick={() => videoRef.current?.click()}
                  style={{
                    ...inputStyle,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: wVideo ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  <Upload size={14} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {wVideo ? wVideo.name : t("training_video") + "..."}
                  </span>
                </div>
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  onChange={e => setWVideo(e.target.files?.[0] || null)}
                  style={{ display: "none" }}
                />
              </div>
            </div>
            {/* Notes */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("notes")}</label>
              <input
                value={wNotes}
                onChange={e => setWNotes(e.target.value)}
                placeholder={t("notes") + "..."}
                style={inputStyle}
              />
            </div>
            {/* Insert Button */}
            <button
              onClick={insertWorkout}
              disabled={!wDay || !wType || wSaving}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                cursor: (!wDay || !wType || wSaving) ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'Chakra Petch', sans-serif",
                backgroundColor: (!wDay || !wType) ? "var(--bg-surface)" : "var(--accent)",
                color: (!wDay || !wType) ? "var(--text-muted)" : "#0A0A0B",
                opacity: wSaving ? 0.6 : 1,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Plus size={16} /> {t("insert")}
            </button>
          </div>

          {/* Filter by day */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterDay("all")}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                backgroundColor: filterDay === "all" ? "var(--accent)" : "var(--bg-card)",
                color: filterDay === "all" ? "#0A0A0B" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              All
            </button>
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setFilterDay(d)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  backgroundColor: filterDay === d ? "var(--accent)" : "var(--bg-card)",
                  color: filterDay === d ? "#0A0A0B" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {dayLabel(d).slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Workout List */}
          {filteredWorkouts.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 40 }}>
              <Dumbbell size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("no_workout_plans")}</p>
            </div>
          ) : (
            Object.entries(groupByDay(filteredWorkouts)).map(([day, items]) => (
              <div key={day} style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 10, fontFamily: "'Chakra Petch', sans-serif" }}>
                  {dayLabel(day)}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map(plan => (
                    <div key={plan.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        backgroundColor: "var(--accent-dim)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Dumbbell size={18} style={{ color: "var(--accent)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600 }}>{workoutTypeLabel(plan.workout_type)}</p>
                        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                          {plan.time_minutes > 0 && (
                            <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock size={11} /> {plan.time_minutes} min
                            </span>
                          )}
                          {plan.video_url && (
                            <a
                              href={`${getApiBase()}${plan.video_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11, color: "var(--blue)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                            >
                              <Video size={11} /> {t("training_video")}
                            </a>
                          )}
                        </div>
                        {plan.notes && (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{plan.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteWorkout(plan.id)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                          backgroundColor: "rgba(255,68,68,0.08)", color: "var(--red)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* ── NUTRITION TAB ── */}
      {tab === "nutrition" && (
        <>
          {/* Insert Form */}
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Plus size={18} style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>{t("nutrition_plan")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              {/* Day */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("select_day")}</label>
                <select value={nDay} onChange={e => setNDay(e.target.value)} style={selectStyle}>
                  <option value="">{t("select_day")}...</option>
                  {DAYS.map(d => <option key={d} value={d}>{dayLabel(d)}</option>)}
                </select>
              </div>
              {/* Meal Time */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("meal_time")}</label>
                <select value={nMealTime} onChange={e => setNMealTime(e.target.value)} style={selectStyle}>
                  <option value="">{t("meal_time")}...</option>
                  {MEAL_TIMES.map(m => <option key={m} value={m}>{mealTimeLabel(m)}</option>)}
                </select>
              </div>
              {/* Meal Type */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("meal_type")}</label>
                <select value={nMealType} onChange={e => setNMealType(e.target.value)} style={selectStyle}>
                  <option value="">{t("meal_type")}...</option>
                  {MEAL_TYPES.map(m => <option key={m} value={m}>{mealTypeLabel(m)}</option>)}
                </select>
              </div>
              {/* Meal Name */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("meal_name")}</label>
                <input
                  value={nMealName}
                  onChange={e => setNMealName(e.target.value)}
                  placeholder={t("meal_name") + "..."}
                  style={inputStyle}
                />
              </div>
              {/* Contents */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("meal_contents")}</label>
                <input
                  value={nContents}
                  onChange={e => setNContents(e.target.value)}
                  placeholder={t("meal_contents") + "..."}
                  style={inputStyle}
                />
              </div>
              {/* Calories */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>{t("calories")}</label>
                <input
                  type="number"
                  value={nCalories}
                  onChange={e => setNCalories(e.target.value)}
                  placeholder="500"
                  style={inputStyle}
                  min={0}
                />
              </div>
            </div>
            {/* Insert Button */}
            <button
              onClick={insertNutrition}
              disabled={!nDay || !nMealTime || !nMealName || nSaving}
              style={{
                marginTop: 16,
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                cursor: (!nDay || !nMealTime || !nMealName || nSaving) ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'Chakra Petch', sans-serif",
                backgroundColor: (!nDay || !nMealTime || !nMealName) ? "var(--bg-surface)" : "var(--accent)",
                color: (!nDay || !nMealTime || !nMealName) ? "var(--text-muted)" : "#0A0A0B",
                opacity: nSaving ? 0.6 : 1,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Plus size={16} /> {t("insert")}
            </button>
          </div>

          {/* Filter by day */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={() => setFilterDay("all")}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                backgroundColor: filterDay === "all" ? "var(--accent)" : "var(--bg-card)",
                color: filterDay === "all" ? "#0A0A0B" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              All
            </button>
            {DAYS.map(d => (
              <button
                key={d}
                onClick={() => setFilterDay(d)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 600,
                  backgroundColor: filterDay === d ? "var(--accent)" : "var(--bg-card)",
                  color: filterDay === d ? "#0A0A0B" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
              >
                {dayLabel(d).slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Nutrition List */}
          {filteredNutrition.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 40 }}>
              <Utensils size={36} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t("no_nutrition_plans")}</p>
            </div>
          ) : (
            Object.entries(groupByDay(filteredNutrition)).map(([day, items]) => (
              <div key={day} style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)", marginBottom: 10, fontFamily: "'Chakra Petch', sans-serif" }}>
                  {dayLabel(day)}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {items.map(plan => (
                    <div key={plan.id} style={{ ...card, display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        backgroundColor: "rgba(59,139,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Utensils size={18} style={{ color: "var(--blue)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600 }}>{plan.meal_name}</p>
                        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                            backgroundColor: "var(--accent-dim)", color: "var(--accent)",
                          }}>
                            {mealTimeLabel(plan.meal_time)}
                          </span>
                          {plan.meal_type && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                              backgroundColor: "rgba(59,139,255,0.1)", color: "var(--blue)",
                            }}>
                              {mealTypeLabel(plan.meal_type)}
                            </span>
                          )}
                          {plan.calories > 0 && (
                            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                              🔥 {plan.calories} kcal
                            </span>
                          )}
                        </div>
                        {plan.contents && (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{plan.contents}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteNutrition(plan.id)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                          backgroundColor: "rgba(255,68,68,0.08)", color: "var(--red)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
