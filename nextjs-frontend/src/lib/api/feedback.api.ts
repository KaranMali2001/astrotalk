import { api } from "./client";

export type Feedback = {
  id: string;
  callId: string;
  userId: string;
  professionalId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string | null;
  };
};

export type CreateFeedbackRequest = {
  callId: string;
  rating: number;
  comment?: string;
};

export const feedbackAPI = {
  createFeedback: (data: CreateFeedbackRequest) =>
    api.post<{ data: Feedback }>("/api/v1/feedback", data),

  getFeedbackByCallId: (callId: string) =>
    api.get<{ data: Feedback | null }>(`/api/v1/feedback/call/${callId}`),

  getFeedbackByProfessionalId: (professionalId: string, limit = 10, offset = 0) =>
    api.get<{
      data: {
        feedbacks: Feedback[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/api/v1/feedback/professional/${professionalId}?limit=${limit}&offset=${offset}`),
};


