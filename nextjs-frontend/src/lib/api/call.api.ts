import type { Professional } from "../types";
import { api } from "./client";

export const callAPI = {
  browseOnline: (query?: string) => {
    const url = query ? `/api/v1/call/browse?query=${encodeURIComponent(query)}` : "/api/v1/call/browse";
    return api.get<Professional[] | { data: Professional[] } | { professionals: Professional[] }>(url);
  },

  initiateCall: (professionalId: string) =>
    api.post<{ ws: string } | { data: { ws: string } }>("/api/v1/call/initiate-call", {
      professionalId,
    }),

  initiateChat: (professionalId: string) =>
    api.post<{ ws: string } | { data: { ws: string } }>("/api/v1/call/initiate-chat", {
      professionalId,
    }),

  initiateVideoCall: (professionalId: string) =>
    api.post<{ ws: string } | { data: { ws: string } }>("/api/v1/call/initiate-video-call", {
      professionalId,
    }),

  cancelCall: (callId: string) => api.post<{ data?: { action: string } }>("/api/v1/call/user/cancel-call", { callId }),

  getUserHistory: () => api.get("/api/v1/call/user/history"),

  getProfHistory: () => api.get("/api/v1/call/professional/history"),
};
