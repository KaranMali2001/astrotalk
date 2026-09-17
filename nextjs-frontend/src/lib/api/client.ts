"use client";

import axios from "axios";
import { clearAuth, getRole, getToken } from "../auth";
import { baseURL } from "../config/env";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Don't override Content-Type if it's already set (e.g., for FormData/multipart)
  // Axios will automatically set the correct Content-Type for FormData
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      // clear and redirect to role-specific login
      const role = getRole();
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = role === "professional" ? "/professional-login" : "/user-login";
      }
    }
    return Promise.reject(error);
  }
);
