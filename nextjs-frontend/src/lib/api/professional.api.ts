import type { ActiveSession, PendingCall, Professional, ProfessionalStats, SessionHistoryItem } from "../types";
import { api } from "./client";

export const professionalAPI = {
  getCurrentProfessional: () => api.get<{ data: { prof: Professional }; prof: Professional }>("/api/v1/professional"),

  getSessionStatus: () =>
    api.get<{
      success: boolean;
      data: {
        activeSession: ActiveSession | null;
        stats: ProfessionalStats;
      };
    }>("/api/v1/professional/session/status"),

  toggleSession: () =>
    api.post<{
      success: boolean;
      data: {
        active: boolean;
        ws?: string;
      };
    }>("/api/v1/professional/session/toggle"),

  getSessionHistory: () => api.get<SessionHistoryItem[]>("/api/v1/professional/session/history"),

  getPendingCalls: () => api.get<{ data: PendingCall[] }>("/api/v1/professional/pending"),

  endCall: (callId: string) => api.post("/api/v1/professional/end-call", { callId }),
};
