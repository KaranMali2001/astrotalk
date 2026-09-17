"use client";

import { userAPI } from "@/lib/api";
import { User } from "@/lib/types/user.types";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getCurrentUser();
      setUser(response.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to fetch user");
      console.error("Error fetching user:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return <UserContext.Provider value={{ user, loading, error, fetchUser }}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
