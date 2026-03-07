import { CalorieCalculator } from "@/components/website/CalorieCalculator";
import { MacroCalculator } from "@/components/app/MacroCalculator";
import { Calculator, Flame, Droplets, Utensils } from "lucide-react";
import { useState, useEffect } from "react";
import { useI18n } from "@/context/I18nContext";

export default function Tools() {
  const { t } = useI18n();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const [bmiHeight, setBmiHeight] = useState<number | "">("");
  const [bmiWeight, setBmiWeight] = useState<number | "">("");
  const [bmiResult, setBmiResult] = useState<{ bmi: number; category: string } | null>(null);
  const [hydrationWeight, setHydrationWeight] = useState<number | "">("");
  const [hydrationActivity, setHydrationActivity] = useState<"low" | "moderate" | "high">("moderate");
  const [hydrationResult, setHydrationResult] = useState<number | null>(null);

  const calculateBMI = () => {
    if (!bmiHeight || !bmiWeight) return;
    const bmi = Number(bmiWeight) / Math.pow(Number(bmiHeight) / 100, 2);
    const category = bmi < 18.5 ? t("underweight") : bmi < 25 ? t("normal_weight") : bmi < 30 ? t("overweight") : t("obese");
    setBmiResult({ bmi: Math.round(bmi * 10) / 10, category });
  };

  const calculateHydration = () => {
    if (!hydrationWeight) return;
    const mult: Record<string, number> = { low: 1.0, moderate: 1.2, high: 1.5 };
    setHydrationResult(Math.round(Number(hydrationWeight) * 30 * mult[hydrationActivity]));
  };

  const bmiColor = !bmiResult ? "var(--accent)" : bmiResult.bmi < 18.5 ? "var(--blue)" : bmiResult.bmi < 25 ? "var(--accent)" : bmiResult.bmi < 30 ? "var(--amber)" : "var(--red)";

  const card = { backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px 20px" };

  return (
    <div style={{ padding: isMobile ? "16px 12px 40px" : "24px 20px 40px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700, marginBottom: 28 }}>{t("fitness_tools")}</h1>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Calorie Calculator */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "rgba(255,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Flame size={18} color="var(--red)" />
            </div>
            <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{t("calorie_calculator")}</h2>
          </div>
          <CalorieCalculator />
        </div>

        {/* BMI Calculator */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "rgba(59,139,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calculator size={18} color="var(--blue)" />
            </div>
            <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{t("bmi_calculator")}</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>{t("bmi_desc")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{t("height_cm")}</label>
              <input type="number" placeholder="175" value={bmiHeight} onChange={(e) => setBmiHeight(e.target.value === "" ? "" : Number(e.target.value))} className="input-base" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{t("weight_kg")}</label>
              <input type="number" placeholder="70" value={bmiWeight} onChange={(e) => setBmiWeight(e.target.value === "" ? "" : Number(e.target.value))} className="input-base" />
            </div>
          </div>
          <button onClick={calculateBMI} style={{ width: "100%", padding: "11px", borderRadius: 10, backgroundColor: "rgba(59,139,255,0.15)", border: "1px solid rgba(59,139,255,0.3)", color: "var(--blue)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t("calculate_bmi")}</button>
          {bmiResult && (
            <div style={{ marginTop: 14, padding: "14px", backgroundColor: `${bmiColor}10`, border: `1px solid ${bmiColor}30`, borderRadius: 12, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{t("your_bmi")}</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 36, fontWeight: 700, color: bmiColor, lineHeight: 1 }}>{bmiResult.bmi}</p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{bmiResult.category}</p>
            </div>
          )}
        </div>

        {/* Hydration Calculator */}
        <div style={{ ...card, gridColumn: "span 1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "rgba(0,212,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Droplets size={18} color="var(--cyan)" />
            </div>
            <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{t("hydration_calculator")}</h2>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>{t("hydration_desc")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{t("weight_kg")}</label>
              <input type="number" placeholder="70" value={hydrationWeight} onChange={(e) => setHydrationWeight(e.target.value === "" ? "" : Number(e.target.value))} className="input-base" />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>{t("activity_level")}</label>
              <select value={hydrationActivity} onChange={(e) => setHydrationActivity(e.target.value as any)} className="input-base" style={{ cursor: "pointer" }}>
                <option value="low">{t("low_activity")}</option>
                <option value="moderate">{t("moderate_activity")}</option>
                <option value="high">{t("high_activity")}</option>
              </select>
            </div>
          </div>
          <button onClick={calculateHydration} style={{ width: "100%", padding: "11px", borderRadius: 10, backgroundColor: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.25)", color: "var(--cyan)", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t("calculate_water")}</button>
          {hydrationResult && (
            <div style={{ marginTop: 14, padding: "14px", backgroundColor: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{t("daily_water")}</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 36, fontWeight: 700, color: "var(--cyan)", lineHeight: 1 }}>{hydrationResult} <span style={{ fontSize: 16, fontWeight: 400 }}>{t("ml")}</span></p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{(hydrationResult / 1000).toFixed(1)} {t("liters")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Macro Nutrients Calculator — full width */}
      <div style={{ marginTop: 24 }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "rgba(200,255,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Utensils size={18} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 15, fontWeight: 700 }}>{t("macro_calculator")}</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t("macro_desc")}</p>
            </div>
          </div>
          <MacroCalculator />
        </div>
      </div>
    </div>
  );
}
