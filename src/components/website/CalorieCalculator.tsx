import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calculator, ArrowRight } from "lucide-react";

const schema = z.object({
  weight: z.number().min(20, "Weight must be at least 20kg").max(300, "Weight must be less than 300kg"),
  height: z.number().min(100, "Height must be at least 100cm").max(250, "Height must be less than 250cm"),
  age: z.number().min(10, "Age must be at least 10").max(100, "Age must be less than 100"),
  gender: z.enum(["male", "female"]),
  activity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
});

type FormData = z.infer<typeof schema>;

export function CalorieCalculator() {
  const [result, setResult] = useState<number | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    // Mifflin-St Jeor Equation
    let bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age;
    if (data.gender === "male") {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = bmr * multipliers[data.activity];
    setResult(Math.round(tdee));
  };

  const iS: React.CSSProperties = { backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", width: "100%", fontSize: 13, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", outline: "none" };
  const lS: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" as "uppercase", display: "block", marginBottom: 5 };

  return (
    <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px" }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lS}>Gender</label>
            <select {...register("gender")} style={{ ...iS, cursor: "pointer" }}>
              <option value="male">Male</option><option value="female">Female</option>
            </select>
          </div>
          <div>
            <label style={lS}>Age</label>
            <input type="number" {...register("age", { valueAsNumber: true })} style={iS} placeholder="25" />
            {errors.age && <p style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>{errors.age.message}</p>}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lS}>Weight (kg)</label>
            <input type="number" {...register("weight", { valueAsNumber: true })} style={iS} placeholder="70" />
            {errors.weight && <p style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>{errors.weight.message}</p>}
          </div>
          <div>
            <label style={lS}>Height (cm)</label>
            <input type="number" {...register("height", { valueAsNumber: true })} style={iS} placeholder="175" />
            {errors.height && <p style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>{errors.height.message}</p>}
          </div>
        </div>
        <div>
          <label style={lS}>Activity Level</label>
          <select {...register("activity")} style={{ ...iS, cursor: "pointer" }}>
            <option value="sedentary">Sedentary</option>
            <option value="light">Light (1–3x/week)</option>
            <option value="moderate">Moderate (4–5x/week)</option>
            <option value="active">Active (daily)</option>
            <option value="very_active">Very Active</option>
          </select>
        </div>
        <button type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 9, backgroundColor: "var(--accent)", color: "#0A0A0B", fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
          Calculate <ArrowRight size={14} />
        </button>
      </form>
      {result && (
        <div style={{ marginTop: 14, padding: "14px", backgroundColor: "var(--accent-dim)", border: "1px solid rgba(200,255,0,0.25)", borderRadius: 12, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>Estimated daily needs</p>
          <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 32, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}>{result} <span style={{ fontSize: 14, fontWeight: 400 }}>kcal/day</span></p>
        </div>
      )}
    </div>
  );
}
