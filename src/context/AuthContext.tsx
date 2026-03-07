import { getApiBase } from "@/lib/api";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "coach" | "user" | "moderator";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  isPremium: boolean;
  coachMembershipActive: boolean;
  membershipPaid: boolean;
  points: number;
  height?: number;
  weight?: number;
  gender?: 'male' | 'female' | 'other';
  steps: number;
  stepGoal: number;
  createdAt?: string;
}

/** Returns true if user is premium OR within the 7-day free trial */
export function isTrialOrPremium(user: User | null): boolean {
  if (!user) return false;
  if (user.isPremium) return true;
  if (!user.createdAt) return true; // assume trial if no date (new user)
  const daysSinceCreation = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation <= 7;
}

/** Days remaining in trial */
export function trialDaysLeft(user: User | null): number {
  if (!user || user.isPremium || !user.createdAt) return 7;
  const daysSince = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(7 - daysSince));
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  register: (email: string, password: string, name: string, role?: "user" | "coach") => Promise<void>;
  completeSocialLogin: (jwtToken: string) => Promise<User>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapServerUser = (data: any): User => ({
  id: String(data.id),
  name: data.name || data.email?.split('@')[0] || 'User',
  email: data.email,
  role: (data.role as UserRole) || "user",
  isPremium: Boolean(data.is_premium),
  coachMembershipActive: Boolean(data.coach_membership_active),
  membershipPaid: Boolean(data.membership_paid),
  points: data.points || 0,
  steps: data.steps || 0,
  stepGoal: data.step_goal || 10000,
  avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
  height: data.height,
  weight: data.weight,
  gender: data.gender,
  createdAt: data.created_at,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always restore from localStorage on refresh - session persists until explicit logout
  const getInitialState = () => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      try {
        return { user: JSON.parse(storedUser) as User, token: storedToken };
      } catch (e) {}
    }
    return { user: null, token: null };
  };

  const initial = getInitialState();
  const [user, setUser] = useState<User | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  const [loading, setLoading] = useState(true);

  const getStoredAuthUser = (): User | null => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  };

  const ensureSingleAccount = (nextEmail: string) => {
    const existingToken = localStorage.getItem("token");
    const existingUser = getStoredAuthUser();
    const existingEmail = existingUser?.email?.toLowerCase?.();
    const wantedEmail = String(nextEmail || "").trim().toLowerCase();

    // Prevent switching account in another tab/window without explicit logout.
    if (existingToken && existingEmail && wantedEmail && existingEmail !== wantedEmail) {
      throw new Error(`You are already signed in as ${existingEmail}. Please logout first before signing in with another account.`);
    }
  };

  // On mount, re-fetch fresh user data from server to sync any backend changes
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { setLoading(false); return; }
    fetch(getApiBase() + '/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          const fresh = mapServerUser(data.user);
          setUser(fresh);
          localStorage.setItem("user", JSON.stringify(fresh));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Keep auth state synchronized across tabs/windows.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "token" && e.key !== "user") return;
      const nextToken = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!nextToken || !rawUser) {
        setToken(null);
        setUser(null);
        return;
      }

      try {
        const parsed = JSON.parse(rawUser) as User;
        setToken(nextToken);
        setUser(parsed);
      } catch {
        setToken(null);
        setUser(null);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    ensureSingleAccount(email);

    const response = await fetch(getApiBase() + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error('Server is unreachable. Please check your connection and try again.'); }
    if (!response.ok) throw new Error(data.message || 'Login failed');

    const userData = mapServerUser(data.user);
    setToken(data.token);
    setUser(userData);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));
    return data;
  };

  const register = async (email: string, password: string, name: string, role: "user" | "coach" = "user") => {
    ensureSingleAccount(email);

    const response = await fetch(getApiBase() + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role }),
    });
    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error('Server is unreachable. Please try again later.'); }
    if (!response.ok) throw new Error(data.message || 'Registration failed');

    const userData = mapServerUser(data.user);
    setToken(data.token);
    setUser(userData);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const completeSocialLogin = async (jwtToken: string): Promise<User> => {
    const response = await fetch(getApiBase() + '/api/auth/me', {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error('Server is unreachable. Please try again later.'); }
    if (!response.ok || !data?.user) {
      throw new Error(data?.message || 'Failed to complete social login');
    }

    const userData = mapServerUser(data.user);
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const refreshUser = async () => {
    const t = localStorage.getItem("token");
    if (!t) return;
    const r = await fetch(getApiBase() + '/api/auth/me', { headers: { Authorization: `Bearer ${t}` } });
    if (r.ok) {
      const data = await r.json();
      if (data?.user) {
        const fresh = mapServerUser(data.user);
        setUser(fresh);
        localStorage.setItem("user", JSON.stringify(fresh));
      }
    }
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });

    // Sync all profile fields to backend
    const t = localStorage.getItem("token");
    if (!t) return;

    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.height !== undefined) payload.height = data.height;
    if (data.weight !== undefined) payload.weight = data.weight;
    if (data.gender !== undefined) payload.gender = data.gender;
    if (data.points !== undefined) payload.points = data.points;

    if (Object.keys(payload).length > 0) {
      fetch(getApiBase() + '/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(payload),
      }).then(r => r.ok ? r.json() : null)
        .then(json => {
          if (json?.user) {
            const fresh = mapServerUser(json.user);
            setUser(fresh);
            localStorage.setItem("user", JSON.stringify(fresh));
          }
        })
        .catch(() => {});
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, completeSocialLogin, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
