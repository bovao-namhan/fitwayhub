import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getApiBase } from "@/lib/api";
import { useTheme } from "@/context/ThemeContext";

export interface Branding {
  app_name: string;
  app_tagline: string;
  logo_url: string;
  logo_url_en: string;
  logo_url_ar: string;
  favicon_url: string;
  footer_text: string;
  copyright_text: string;
  social_instagram: string;
  social_facebook: string;
  social_twitter: string;
  social_youtube: string;
  primary_color: string;
  secondary_color: string;
  bg_primary: string;
  bg_card: string;
  font_en: string;
  font_ar: string;
  font_heading: string;
}

const defaults: Branding = {
  app_name: "FitWay Hub",
  app_tagline: "Your fitness journey starts here",
  logo_url: "",
  logo_url_en: "",
  logo_url_ar: "",
  favicon_url: "",
  footer_text: "Egypt's #1 digital fitness ecosystem. Certified training, smart tools, and a community that pushes you forward.",
  copyright_text: "© 2025 FitWay Hub. All rights reserved.",
  social_instagram: "",
  social_facebook: "",
  social_twitter: "",
  social_youtube: "",
  primary_color: "#C8FF00",
  secondary_color: "#3B8BFF",
  bg_primary: "#0A0A0B",
  bg_card: "#111113",
  font_en: "Outfit",
  font_ar: "Cairo",
  font_heading: "Chakra Petch",
};

interface BrandingContextValue {
  branding: Branding;
  refresh: () => void;
  isReady: boolean;
}

const BrandingContext = createContext<BrandingContextValue>({ branding: defaults, refresh: () => {}, isReady: false });
const BRANDING_CACHE_KEY = "fitway_branding_cache";

const hexToRgba = (hex: string, alpha: number) => {
  const raw = String(hex || "").trim().replace(/^#/, "");
  const normalized = raw.length === 3
    ? raw.split("").map((c) => `${c}${c}`).join("")
    : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "";
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveAssetUrl = (url: string) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const base = getApiBase();
  if (!base) return raw;
  return `${base}${raw.startsWith("/") ? "" : "/"}${raw}`;
};

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(() => {
    try {
      const raw = localStorage.getItem(BRANDING_CACHE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });
  const { isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const setCssVar = (name: string, value?: string) => {
    const v = String(value || "").trim();
    if (!v) return;
    document.documentElement.style.setProperty(name, v);
  };

  const refresh = useCallback(() => {
    fetch(getApiBase() + "/api/admin/branding")
      .then(r => r.json())
      .then(data => {
        try {
          localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(data || {}));
        } catch {
          // ignore cache write failures (e.g., storage full)
        }
        const normalized = {
          ...data,
          logo_url: resolveAssetUrl(data?.logo_url || ""),
          logo_url_en: resolveAssetUrl(data?.logo_url_en || ""),
          logo_url_ar: resolveAssetUrl(data?.logo_url_ar || ""),
          favicon_url: resolveAssetUrl(data?.favicon_url || ""),
        };
        setBranding(prev => ({ ...prev, ...normalized }));
      })
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onManualRefresh = () => refresh();
    window.addEventListener("branding:refresh", onManualRefresh as EventListener);
    return () => window.removeEventListener("branding:refresh", onManualRefresh as EventListener);
  }, [refresh]);

  // Apply favicon dynamically
  useEffect(() => {
    if (branding.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
    }
  }, [branding.favicon_url]);

  // Update document title
  useEffect(() => {
    if (branding.app_name) {
      document.title = branding.app_name;
    }
  }, [branding.app_name]);

  // Apply dynamic theme tokens from branding settings.
  useEffect(() => {
    setCssVar("--accent", branding.primary_color);
    setCssVar("--blue", branding.secondary_color);

    // Only apply custom dark backgrounds while dark mode is active.
    // In light mode, remove runtime overrides so `html.light` vars take over.
    if (isDark) {
      setCssVar("--bg-primary", branding.bg_primary);
      setCssVar("--bg-card", branding.bg_card);
    } else {
      document.documentElement.style.removeProperty("--bg-primary");
      document.documentElement.style.removeProperty("--bg-card");
    }

    const accent = String(branding.primary_color || "").trim();
    const accentDim = hexToRgba(accent, 0.12);
    const accentGlow = hexToRgba(accent, 0.25);
    if (accentDim && accentGlow) {
      document.documentElement.style.setProperty("--accent-dim", accentDim);
      document.documentElement.style.setProperty("--accent-glow", accentGlow);
    } else {
      document.documentElement.style.removeProperty("--accent-dim");
      document.documentElement.style.removeProperty("--accent-glow");
    }

    const fontEn = String(branding.font_en || defaults.font_en).trim();
    const fontAr = String(branding.font_ar || defaults.font_ar).trim();
    const fontHeading = String(branding.font_heading || defaults.font_heading).trim();
    document.documentElement.style.setProperty("--font-en", `'${fontEn}', sans-serif`);
    document.documentElement.style.setProperty("--font-ar", `'${fontAr}', sans-serif`);
    document.documentElement.style.setProperty("--font-heading", `'${fontHeading}', sans-serif`);
  }, [
    isDark,
    branding.primary_color,
    branding.secondary_color,
    branding.bg_primary,
    branding.bg_card,
    branding.font_en,
    branding.font_ar,
    branding.font_heading,
  ]);

  // Load selected fonts from Google Fonts so changes are visible immediately.
  useEffect(() => {
    const fonts = [branding.font_en, branding.font_ar, branding.font_heading]
      .map((f) => String(f || "").trim())
      .filter(Boolean);
    if (!fonts.length) return;

    const familyParams = Array.from(new Set(fonts))
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;

    let link = document.getElementById("branding-dynamic-fonts") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "branding-dynamic-fonts";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [branding.font_en, branding.font_ar, branding.font_heading]);

  return (
    <BrandingContext.Provider value={{ branding, refresh, isReady }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export function getBrandLogoForLang(branding: Branding, lang: "en" | "ar") {
  if (lang === "ar") return branding.logo_url_ar || branding.logo_url_en || "";
  return branding.logo_url_en || branding.logo_url_ar || "";
}
