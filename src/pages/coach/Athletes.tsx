import { getApiBase } from "@/lib/api";
import { useState, useEffect } from "react";
import { Users, Activity, Dumbbell, Plus, X, Save, Trash2, ChevronRight, Search, Target, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";

interface Athlete {
  id: number; name: string; email: string; avatar: string;
  steps: number; step_goal?: number; height?: number; weight?: number; is_premium: boolean;
  workoutPlan?: { title: string; exercises: number } | null;
  nutritionPlan?: { title: string; daily_calories: number } | null;
}

interface Exercise { id: string; name: string; sets: number; reps: string; rest_seconds: number; day: string; }
interface Meal { id: string; name: string; time: string; calories: number; foods: string; }

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function CoachAthletes() {
  const { token } = useAuth();
  const { t } = useI18n();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [tab, setTab] = useState<"overview" | "workout" | "nutrition">("overview");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingStepGoal, setEditingStepGoal] = useState(false);
  const [stepGoalInput, setStepGoalInput] = useState("");

  const [workoutPlan, setWorkoutPlan] = useState({ title: "", description: "", days_per_week: 3, exercises: [] as Exercise[] });
  const [nutritionPlan, setNutritionPlan] = useState({ title: "", daily_calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, meals: [] as Meal[], notes: "" });

  const api = (path: string, opts?: RequestInit) => fetch(getApiBase() + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } });

  useEffect(() => {
    api("/api/coach/users")
      .then(r => r.json())
      .then(d => setAthletes(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()));

  const selectAthlete = async (a: Athlete) => {
    setSelected(a);
    setTab("overview");
    setEditingStepGoal(false);
    setWorkoutPlan({ title: `${a.name}'s Workout`, description: "", days_per_week: 3, exercises: [] });
    setNutritionPlan({ title: `${a.name}'s Nutrition`, daily_calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, meals: [], notes: "" });
    // Load existing plans and profile
    try {
      const [wp, np, profile] = await Promise.all([
        api(`/api/coach/users/${a.id}/workout-plan`).then(r => r.json()),
        api(`/api/coach/users/${a.id}/nutrition-plan`).then(r => r.json()),
        api(`/api/coach/users/${a.id}/profile`).then(r => r.json()),
      ]);
      if (profile?.user) {
        setSelected(s => s ? { ...s, step_goal: profile.user.step_goal || 10000 } : s);
      }
      if (wp.plan) {
        setWorkoutPlan({
          title: wp.plan.title || `${a.name}'s Workout`,
          description: wp.plan.description || "",
          days_per_week: wp.plan.days_per_week || 3,
          exercises: Array.isArray(wp.plan.exercises) ? wp.plan.exercises.map((e: any) => ({ ...e, id: e.id || Date.now().toString() })) : [],
        });
      }
      if (np.plan) {
        setNutritionPlan({
          title: np.plan.title || `${a.name}'s Nutrition`,
          daily_calories: np.plan.daily_calories || 2000,
          protein_g: np.plan.protein_g || 150,
          carbs_g: np.plan.carbs_g || 250,
          fat_g: np.plan.fat_g || 65,
          meals: Array.isArray(np.plan.meals) ? np.plan.meals.map((m: any) => ({ ...m, id: m.id || Date.now().toString() })) : [],
          notes: np.plan.notes || "",
        });
      }
    } catch {}
  };

  const showMsg = (m: string) => { setMessage(m); setTimeout(() => setMessage(""), 3000); };

  const saveWorkout = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api(`/api/coach/users/${selected.id}/workout-plan`, { method: "POST", body: JSON.stringify(workoutPlan) });
      if (r.ok) showMsg(t("workout_saved")); else showMsg(t("failed_save"));
    } catch { showMsg(t("failed_save")); }
    finally { setSaving(false); }
  };

  const saveNutrition = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await api(`/api/coach/users/${selected.id}/nutrition-plan`, { method: "POST", body: JSON.stringify(nutritionPlan) });
      if (r.ok) showMsg(t("nutrition_saved")); else showMsg(t("failed_save"));
    } catch { showMsg(t("failed_save")); }
    finally { setSaving(false); }
  };

  const addExercise = () => setWorkoutPlan(p => ({ ...p, exercises: [...p.exercises, { id: Date.now().toString(), name: "", sets: 3, reps: "10", rest_seconds: 60, day: "Monday" }] }));
  const updateEx = (id: string, k: keyof Exercise, v: any) => setWorkoutPlan(p => ({ ...p, exercises: p.exercises.map(e => e.id === id ? { ...e, [k]: v } : e) }));
  const removeEx = (id: string) => setWorkoutPlan(p => ({ ...p, exercises: p.exercises.filter(e => e.id !== id) }));

  const addMeal = () => setNutritionPlan(p => ({ ...p, meals: [...p.meals, { id: Date.now().toString(), name: "", time: "08:00", calories: 400, foods: "" }] }));
  const updateMeal = (id: string, k: keyof Meal, v: any) => setNutritionPlan(p => ({ ...p, meals: p.meals.map(m => m.id === id ? { ...m, [k]: v } : m) }));
  const removeMeal = (id: string) => setNutritionPlan(p => ({ ...p, meals: p.meals.filter(m => m.id !== id) }));

  const bmi = selected?.height && selected?.weight ? (selected.weight / ((selected.height / 100) ** 2)).toFixed(1) : null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const showAthleteList = !isMobile || !selected;
  const showAthleteDetail = !isMobile || !!selected;

  return (
    <div style={{ display: "flex", gap: 20, minHeight: "calc(100dvh - 100px)", flexDirection: isMobile ? "column" : "row" }}>
      <div style={{ width: isMobile ? "100%" : 260, flexShrink: 0, display: showAthleteList ? "block" : "none" }}>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", position: "sticky", top: 20 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{t("my_athletes")}</p>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="input-base" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_placeholder")} style={{ paddingInlineStart: 30, padding: "7px 10px 7px 30px", fontSize: 12 }} />
            </div>
          </div>
          <div style={{ maxHeight: "calc(100dvh - 260px)", overflowY: "auto" }}>
            {loading ? (
              <p style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>{t("coach_athletes_loading")}</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>{t("coach_athletes_none")}</p>
            ) : filtered.map(a => (
              <button key={a.id} onClick={() => selectAthlete(a)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)", background: selected?.id === a.id ? "var(--accent-dim)" : "none", border: "none", cursor: "pointer", textAlign: "start", borderInlineStart: selected?.id === a.id ? "3px solid var(--blue)" : "3px solid transparent", transition: "all 0.15s" }}>
                <img src={a.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.email}`} alt={a.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{a.steps?.toLocaleString() || 0} {t("steps")}</p>
                </div>
                <ChevronRight size={13} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: showAthleteDetail ? "block" : "none" }}>
        {!selected ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, flexDirection: "column", gap: 12, color: "var(--text-muted)" }}>
            <Users size={48} strokeWidth={1} />
            <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15 }}>{t("select_athlete")}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 22px" }}>
              {isMobile && (
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "0 0 12px 0", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>← {t("coach_athletes_back")}</button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <img src={selected.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selected.email}`} alt={selected.name} style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid var(--blue)" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700 }}>{selected.name}</p>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{selected.email}</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(["overview","workout","nutrition"] as const).map(tabKey => (
                    <button key={tabKey} onClick={() => setTab(tabKey)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${tab === tabKey ? "var(--blue)" : "var(--border)"}`, background: tab === tabKey ? "rgba(59,139,255,0.12)" : "var(--bg-surface)", color: tab === tabKey ? "var(--blue)" : "var(--text-secondary)", fontSize: 12, fontWeight: tab === tabKey ? 600 : 400, cursor: "pointer", textTransform: "capitalize", fontFamily: "'Chakra Petch', sans-serif" }}>{tabKey === "overview" ? t("overview") : tabKey === "workout" ? t("workout") : t("nutrition")}</button>
                  ))}
                </div>
              </div>
            </div>

            {message && <div style={{ padding: "10px 16px", backgroundColor: message.startsWith("✅") ? "var(--accent-dim)" : "rgba(255,68,68,0.08)", border: `1px solid ${message.startsWith("✅") ? "var(--accent)" : "var(--red)"}`, borderRadius: 10, fontSize: 13, color: message.startsWith("✅") ? "var(--accent)" : "var(--red)" }}>{message}</div>}

            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                  {[
                    { label: t("height_label"), value: selected.height ? `${selected.height} cm` : "—", color: "var(--blue)" },
                    { label: t("weight_label"), value: selected.weight ? `${selected.weight} kg` : "—", color: "var(--amber)" },
                    { label: "BMI", value: bmi || "—", color: "var(--cyan)" },
                    { label: t("coach_requests_steps_today"), value: (selected.steps || 0).toLocaleString(), color: "var(--accent)" },
                    { label: t("premium_member"), value: selected.is_premium ? t("yes") : t("free_label"), color: selected.is_premium ? "var(--accent)" : "var(--text-muted)" },
                  ].map(s => (
                    <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</p>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Step Goal Editor */}
                <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Target size={15} color="var(--accent)" />
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700 }}>{t("step_goal_label")}</p>
                    </div>
                    {!editingStepGoal && (
                      <button onClick={() => { setStepGoalInput(String(selected.step_goal || 10000)); setEditingStepGoal(true); }} style={{ fontSize: 11, color: "var(--blue)", background: "rgba(59,139,255,0.1)", border: "1px solid rgba(59,139,255,0.2)", borderRadius: 7, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>
                        {t("edit")}
                      </button>
                    )}
                  </div>
                  {editingStepGoal ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="number"
                        value={stepGoalInput}
                        onChange={e => setStepGoalInput(e.target.value)}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 14, fontFamily: "'Chakra Petch', sans-serif", outline: "none" }}
                        min={500} max={100000}
                      />
                      <button onClick={async () => {
                        const val = parseInt(stepGoalInput);
                        if (!val) return;
                        try {
                          const r = await api(`/api/coach/users/${selected.id}/step-goal`, { method: "PATCH", body: JSON.stringify({ step_goal: val }) });
                          if (r.ok) {
                            setAthletes(a => a.map(x => x.id === selected.id ? { ...x, step_goal: val } : x));
                            setSelected(s => s ? { ...s, step_goal: val } : s);
                            setEditingStepGoal(false);
                            showMsg(t("coach_athletes_step_goal_updated"));
                          }
                        } catch { showMsg(t("coach_athletes_step_goal_failed")); }
                      }} style={{ width: 34, height: 34, borderRadius: 8, background: "var(--accent)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Check size={15} color="#0A0A0B" />
                      </button>
                      <button onClick={() => setEditingStepGoal(false)} style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-surface)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <X size={15} color="var(--text-muted)" />
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                      {(selected.step_goal || 10000).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-muted)" }}>{t("coach_athletes_steps_per_day")}</span>
                    </p>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[{ label: t("workout_plan"), tab: "workout" as const, color: "var(--accent)", bg: "var(--accent-dim)", border: "rgba(200,255,0,0.2)" }, { label: t("nutrition_plan_label"), tab: "nutrition" as const, color: "var(--blue)", bg: "rgba(59,139,255,0.1)", border: "rgba(59,139,255,0.25)" }].map(p => (
                    <div key={p.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700 }}>{p.label}</p>
                        {p.tab === "workout" ? <Dumbbell size={14} color={p.color} /> : <Activity size={14} color={p.color} />}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{p.tab === "workout" ? `${workoutPlan.exercises.length} ${t("exercises")}` : `${nutritionPlan.daily_calories} kcal/day`}</p>
                      <button onClick={() => setTab(p.tab)} style={{ width: "100%", padding: "7px", borderRadius: 8, background: p.bg, border: `1px solid ${p.border}`, color: p.color, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{t("manage_plan")}</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "workout" && (
              <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{t("workout_plan")}</p>
                  <button onClick={saveWorkout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#0A0A0B", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif" }}>
                    <Save size={13} /> {saving ? t("saving") : t("save_plan")}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("coach_athletes_plan_title")}</label>
                    <input className="input-base" value={workoutPlan.title} onChange={e => setWorkoutPlan(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("coach_athletes_days_week")}</label>
                    <select className="input-base" value={workoutPlan.days_per_week} onChange={e => setWorkoutPlan(p => ({ ...p, days_per_week: Number(e.target.value) }))}>
                      {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} days</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{t("exercises")} ({workoutPlan.exercises.length})</p>
                  <button onClick={addExercise} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.25)", color: "var(--accent)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}><Plus size={13} /> {t("coach_athletes_add_exercise")}</button>
                </div>
                {workoutPlan.exercises.length === 0 && <p style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>{t("coach_athletes_no_exercises")}</p>}
                {workoutPlan.exercises.map(ex => (
                  <div key={ex.id} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 70px 70px 70px auto", gap: 8, alignItems: "center" }}>
                      <input className="input-base" value={ex.name} onChange={e => updateEx(ex.id, "name", e.target.value)} placeholder="Exercise name" style={{ padding: "7px 10px" }} />
                      <select className="input-base" value={ex.day} onChange={e => updateEx(ex.id, "day", e.target.value)} style={{ padding: "7px 8px", fontSize: 12 }}>
                        {DAYS.map(d => <option key={d} value={d}>{d.slice(0,3)}</option>)}
                      </select>
                      <input className="input-base" type="number" value={ex.sets} onChange={e => updateEx(ex.id, "sets", Number(e.target.value))} placeholder="Sets" style={{ padding: "7px 8px" }} min={1} />
                      <input className="input-base" value={ex.reps} onChange={e => updateEx(ex.id, "reps", e.target.value)} placeholder="Reps" style={{ padding: "7px 8px" }} />
                      <input className="input-base" type="number" value={ex.rest_seconds} onChange={e => updateEx(ex.id, "rest_seconds", Number(e.target.value))} placeholder="Rest" style={{ padding: "7px 8px" }} min={0} />
                      <button onClick={() => removeEx(ex.id)} style={{ background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", borderRadius: 7, padding: "7px", cursor: "pointer", color: "var(--red)" }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "nutrition" && (
              <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{t("nutrition_plan_label")}</p>
                  <button onClick={saveNutrition} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#0A0A0B", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Chakra Petch', sans-serif" }}>
                    <Save size={13} /> {saving ? t("saving") : t("save_plan")}
                  </button>
                </div>
                <input className="input-base" value={nutritionPlan.title} onChange={e => setNutritionPlan(p => ({ ...p, title: e.target.value }))} placeholder={t("coach_athletes_plan_title")} />
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10 }}>
                  {[{ label: "Calories", field: "daily_calories" as const, unit: "kcal", color: "var(--amber)" }, { label: "Protein", field: "protein_g" as const, unit: "g", color: "var(--accent)" }, { label: "Carbs", field: "carbs_g" as const, unit: "g", color: "var(--blue)" }, { label: "Fat", field: "fat_g" as const, unit: "g", color: "var(--red)" }].map(m => (
                    <div key={m.field} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>{m.label}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <input type="number" value={nutritionPlan[m.field]} onChange={e => setNutritionPlan(p => ({ ...p, [m.field]: Number(e.target.value) }))} style={{ background: "none", border: "none", outline: "none", width: "60px", fontSize: 18, fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, color: m.color }} />
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{t("coach_athletes_meals")} ({nutritionPlan.meals.length})</p>
                  <button onClick={addMeal} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, background: "rgba(59,139,255,0.1)", border: "1px solid rgba(59,139,255,0.25)", color: "var(--blue)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}><Plus size={13} /> {t("coach_athletes_add_meal")}</button>
                </div>
                {nutritionPlan.meals.length === 0 && <p style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 13 }}>{t("coach_athletes_no_meals")}</p>}
                {nutritionPlan.meals.map(m => (
                  <div key={m.id} style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 100px auto", gap: 8, alignItems: "center" }}>
                      <input className="input-base" value={m.name} onChange={e => updateMeal(m.id, "name", e.target.value)} placeholder="Meal name" style={{ padding: "7px 10px" }} />
                      <input className="input-base" type="time" value={m.time} onChange={e => updateMeal(m.id, "time", e.target.value)} style={{ padding: "7px 8px" }} />
                      <input className="input-base" type="number" value={m.calories} onChange={e => updateMeal(m.id, "calories", Number(e.target.value))} placeholder="kcal" style={{ padding: "7px 8px" }} min={0} />
                      <button onClick={() => removeMeal(m.id)} style={{ background: "rgba(255,68,68,0.1)", border: "1px solid var(--red)", borderRadius: 7, padding: "7px", cursor: "pointer", color: "var(--red)" }}><Trash2 size={13} /></button>
                    </div>
                    <input className="input-base" value={m.foods} onChange={e => updateMeal(m.id, "foods", e.target.value)} placeholder="Foods: e.g. Oats 80g, Eggs 3, Banana..." style={{ padding: "7px 10px" }} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{t("coach_athletes_notes")}</label>
                  <textarea className="input-base" value={nutritionPlan.notes} onChange={e => setNutritionPlan(p => ({ ...p, notes: e.target.value }))} placeholder={t("coach_athletes_notes_placeholder")} rows={3} style={{ resize: "none" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
