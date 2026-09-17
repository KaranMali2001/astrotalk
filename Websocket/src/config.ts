import dotenv from "dotenv";
import { Config } from "./types";

dotenv.config();

export const config: Config = {
  JWT_SECRET: process.env.JWT_SECRET || "DevKaran",
  JWT_INTERNAL_SECRET: process.env.JWT_INTERNAL_SECRET || "INTERNAL_SECRET",
  WS_PORT: parseInt(process.env.WS_PORT || "8080"),
  API_BASE_URL: process.env.API_BASE_URL || "http://localhost:8000",
  AGORA_WEBHOOK_SECRET: process.env.AGORA_WEBHOOK_SECRET || "uFLl38vMz",
};

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// WebSocket configuration
export const WEBSOCKET_CONFIG = {
  compression: true,
  maxPayloadLength: 32 * 1024,
  idleTimeout: 120,
} as const;
