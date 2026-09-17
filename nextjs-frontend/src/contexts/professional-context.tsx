"use client";

import { professionalAPI } from "@/lib/api";
import type { ActiveSession, Professional, ProfessionalStats } from "@/lib/types";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface ProfessionalContextType {
  professional: Professional | null;
  stats: ProfessionalStats | null;
  activeSession: ActiveSession | null;
  loading: {
    professional: boolean;
    stats: boolean;
  };
  error: string | null;
  fetchProfessional: () => Promise<void>;
  fetchStats: () => Promise<void>;
  refreshSessionStatus: () => Promise<void>;
}

const ProfessionalContext = createContext<ProfessionalContextType | null>(null);

export function ProfessionalProvider({ children }: { children: ReactNode }) {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [stats, setStats] = useState<ProfessionalStats | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState({
    professional: false,
    stats: false,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchProfessional = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, professional: true }));
      setError(null);
      const response = await professionalAPI.getCurrentProfessional();
      setProfessional(response.data.data.prof || response.data.prof);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to fetch professional");
      console.error("Error fetching professional:", err);
    } finally {
      setLoading((prev) => ({ ...prev, professional: false }));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading((prev) => ({ ...prev, stats: true }));
      const response = await professionalAPI.getSessionStatus();
      if (response.data.success && response.data.data) {
        setStats(response.data.data.stats);
        setActiveSession(response.data.data.activeSession);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to fetch stats");
      console.error("Error fetching stats:", err);
    } finally {
      setLoading((prev) => ({ ...prev, stats: false }));
    }
  }, []);

  const refreshSessionStatus = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return (
    <ProfessionalContext.Provider
      value={{
        professional,
        stats,
        activeSession,
        loading,
        error,
        fetchProfessional,
        fetchStats,
        refreshSessionStatus,
      }}
    >
      {children}
    </ProfessionalContext.Provider>
  );
}

export function useProfessional() {
  const context = useContext(ProfessionalContext);
  if (!context) {
    throw new Error("useProfessional must be used within ProfessionalProvider");
  }
  return context;
}
