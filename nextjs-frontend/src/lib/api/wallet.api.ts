import { api } from "./client";

export const walletAPI = {
  getBalance: () => api.get("/api/v1/wallet"),
  getTransactions: () => api.get("/api/v1/wallet/transactions"),
};
