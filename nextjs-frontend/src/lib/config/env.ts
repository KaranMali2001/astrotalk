export const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// WebSocket base URL - convert HTTP to WebSocket protocol
export const wsBaseURL = process.env.NEXT_PUBLIC_WS_URL || baseURL.replace(/^http/, "ws").replace(/^https/, "wss") || "ws://api.wetakecare.me";
