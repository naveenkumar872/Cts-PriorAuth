import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { UserRole, UserProfile } from "@/lib/roles";
import { USER_PROFILES } from "@/lib/roles";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
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

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("priorauth_token");
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, loginAsRole, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
