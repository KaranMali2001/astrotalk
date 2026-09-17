import { api } from "./client";

export const authAPI = {
  login: (phoneNumber: string, otp: string) =>
    api.post<{ token: string; role: string }>("/api/v1/auth/login", {
      phoneNumber,
      otp,
    }),
  checkUser: (phoneNumber: string) =>
    api.post<{ user: any; professional: any }>("/api/v1/auth/check", {
      phoneNumber,
    }),
};
