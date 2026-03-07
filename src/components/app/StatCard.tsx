import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  color: "accent" | "blue" | "amber" | "red" | "cyan";
  trend?: string;
  subtitle?: string;
}

const colorMap: Record<string, { icon: string; iconBg: string; trend: string }> = {
  accent: { icon: "var(--accent)",       iconBg: "var(--accent-dim)",          trend: "var(--accent)" },
  blue:   { icon: "var(--blue)",         iconBg: "rgba(59,139,255,0.12)",      trend: "var(--blue)" },
  amber:  { icon: "var(--amber)",        iconBg: "rgba(255,179,64,0.12)",      trend: "var(--amber)" },
  red:    { icon: "var(--red)",          iconBg: "rgba(255,68,68,0.12)",       trend: "var(--red)" },
  cyan:   { icon: "var(--cyan)",         iconBg: "rgba(0,212,255,0.12)",       trend: "var(--cyan)" },
};

// backward compat aliases
const colorAlias: Record<string, string> = {
  emerald: "accent",
  rose: "red",
};

export function StatCard({ title, value, unit, icon: Icon, color, trend, subtitle }: StatCardProps) {
  const resolvedColor = colorAlias[color] ?? color;
  const c = colorMap[resolvedColor] ?? colorMap.accent;

  return (
    <div
      className="card fade-up"
      style={{
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "default",
        transition: "border-color 0.2s, transform 0.2s",
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = c.icon;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </span>
        <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={c.icon} strokeWidth={2} />
        </div>
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{unit}</span>
          )}
        </div>
        {trend && (
          <p style={{ fontSize: 11, marginTop: 4, color: c.trend, fontWeight: 500 }}>
            {trend}
          </p>
        )}
        {subtitle && (
          <p style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
