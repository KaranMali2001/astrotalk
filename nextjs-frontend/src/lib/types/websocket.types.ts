export interface UseWebSocketOptions {
  enabled?: boolean;
  onMessage?: (data: any, raw: MessageEvent) => void;
  onOpen?: (ev: Event) => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  reconnect?: boolean;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

export const WebSocketEventType = {
  INCOMING_CALL: "incoming_call",
  CALL_STARTED: "call_started",
  CALL_REJECTED: "call_rejected",
  CALL_ENDED: "call_ended",
  ERROR: "error",
} as const;

export type WebSocketEventType = (typeof WebSocketEventType)[keyof typeof WebSocketEventType];
