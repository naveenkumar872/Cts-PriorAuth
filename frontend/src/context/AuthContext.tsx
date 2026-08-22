import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { UserRole, UserProfile } from "@/lib/roles";
import { USER_PROFILES } from "@/lib/roles";
import { api } from "@/lib/api";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (data: { name: string; email: string; password: string; role: UserRole; organization?: string; contact?: string }) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  setAuthUser: (profile: UserProfile, token?: string) => void;
  logout: () => void;
  error: string | null;
}


const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "priorauth_user";

// Demo credential map — no backend required
const DEMO_CREDENTIALS: Record<string, UserRole> = {
  "provider@demo.com": "provider",
  "reviewer@demo.com": "reviewer",
};
const DEMO_PASSWORDS: Record<string, string> = {
  "provider@demo.com": "Provider@123",
  "reviewer@demo.com": "Reviewer@123",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setUser(JSON.parse(stored)); }
      catch { localStorage.removeItem(STORAGE_KEY); }
    }
    setIsLoading(false);
  }, []);

  // Email + password login (demo credentials, no backend needed)
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const role = DEMO_CREDENTIALS[email.toLowerCase()];
    const expectedPw = DEMO_PASSWORDS[email.toLowerCase()];

    if (!role || password !== expectedPw) {
      const msg = "Invalid email or password. Use the Demo Account buttons below.";
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    }

    const profile = USER_PROFILES[role];
    setUser(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setIsLoading(false);
  }, []);

  // One-click role login for the demo buttons
  const loginAsRole = useCallback((role: UserRole) => {
    const profile = USER_PROFILES[role];
    setUser(profile);
    setError(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, []);

  // Direct set auth user (used by OAuth callback)
  const setAuthUser = useCallback((profile: UserProfile, token?: string) => {
    setUser(profile);
    setError(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    if (token) {
      localStorage.setItem("priorauth_token", token);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("priorauth_token");
    setError(null);
  }, []);

  const registerUser = useCallback(async (data: { name: string; email: string; password: string; role: UserRole; organization?: string; contact?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = (await api.register(data)) as { user: any; token: string };
      const profile: UserProfile = {
        id: resp.user.id,
        name: resp.user.name,
        email: resp.user.email,
        role: resp.user.role as UserRole,
        organization: resp.user.organization || "",
        contact: resp.user.contact || "",
      };
      setUser(profile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      if (resp.token) localStorage.setItem("priorauth_token", resp.token);
    } catch {
      // Demo fallback if backend registration endpoint is unconfigured
      const profile: UserProfile = {
        id: `usr-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        organization: data.organization || (data.role === "provider" ? "Healthcare Provider Center" : "Insurance Payer Operations"),
        contact: data.contact || "",
      };
      setUser(profile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, registerUser, loginAsRole, setAuthUser, logout, error }}>
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
