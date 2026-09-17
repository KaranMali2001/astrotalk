"use client";

import { clearAuth, getRole, getToken, setAuth, type AuthRole } from "@/lib/auth";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface AuthContextType {
  token: string | null;
  role: AuthRole | null;
  isAuthenticated: boolean;
  login: (token: string, role: AuthRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<AuthRole | null>(null);

  useEffect(() => {
    // Initialize from localStorage
    setToken(getToken());
    setRole(getRole());
  }, []);

  const login = (newToken: string, newRole: AuthRole) => {
    setAuth(newToken, newRole);
    setToken(newToken);
    setRole(newRole);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setRole(null);
    if (typeof window !== "undefined") {
      window.location.href = role === "professional" ? "/professional-login" : "/user-login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        isAuthenticated: !!token && !!role,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
