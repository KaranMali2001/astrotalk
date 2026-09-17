import { User } from "../types/user.types";
import { api } from "./client";

export const userAPI = {
  getCurrentUser: () => api.get<{ data: User }>("/api/v1/user"),
};
