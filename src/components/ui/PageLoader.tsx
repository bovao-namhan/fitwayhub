import { Activity } from "lucide-react";
import { useBranding, getBrandLogoForLang } from "@/context/BrandingContext";
import { useI18n } from "@/context/I18nContext";

/** Full-screen loading spinner matching FitWay brand */
export default function PageLoader() {
  const { branding } = useBranding();
  const { lang } = useI18n();
  const logo = getBrandLogoForLang(branding, lang);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 0,
        backgroundColor: "var(--bg-primary)",
        zIndex: 99998,
      }}
    >
      {logo ? (
        <img src={logo} alt="logo" style={{ maxWidth: "min(62vw, 320px)", maxHeight: 120, objectFit: "contain" }} />
      ) : (
        <div style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Activity size={28} color="#0A0A0B" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
}
