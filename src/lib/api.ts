/**
 * Centralized API base URL module.
 *
 * On web (dev) the Vite proxy handles /api → localhost:3000, so the base is "".
 * On native Capacitor builds (Android / iOS) there is no proxy — the admin sets
 * the full backend URL (e.g. "https://api.fitwayhub.com") in the admin panel,
 * which is persisted to localStorage and to the server-side system_settings table.
 *
 * Usage:
 *   import { getApiBase } from "@/lib/api";
 *   fetch(getApiBase() + "/api/auth/login", { ... })
 */

const LS_KEY = "fitway_server_url";

function isNativeCapacitorRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  try {
    return !!cap?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/** Returns the current API base URL (empty string when no override is set). */
export function getApiBase(): string {
  // In browser/web dev, always use relative /api so requests hit the current local server.
  // Stored override is intended for native builds where there is no Vite proxy.
  if (!isNativeCapacitorRuntime()) return "";

  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && stored.trim()) {
      // Strip trailing slash to avoid double-slash issues
      return stored.trim().replace(/\/+$/, "");
    }
  } catch {
    // localStorage may throw in some contexts
  }
  // Default backend URL for native builds (no Vite proxy available)
  return "https://peter-adel.taila6a2b4.ts.net";
}

/** Persist a new API base URL. Pass empty string to clear (use relative). */
export function setApiBase(url: string): void {
  try {
    const clean = (url || "").trim().replace(/\/+$/, "");
    if (clean) {
      localStorage.setItem(LS_KEY, clean);
    } else {
      localStorage.removeItem(LS_KEY);
    }
  } catch {
    // ignore
  }
}

