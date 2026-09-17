"use client";

import { useWebSocket } from "@/hooks/use-websocket";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface WebSocketContextType {
  wsUrl: string | null;
  connected: boolean;
  send: ((payload: any) => boolean) | null;
  setWsUrl: (url: string | null) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const handleMessage = useCallback((data: any) => {
    console.log("[WebSocket] Message received:", data);
  }, []);

  const handleOpen = useCallback(() => {
    console.log("[WebSocket] Connected");
  }, []);

  const handleClose = useCallback((ev: CloseEvent) => {
    console.log("[WebSocket] Closed with code:", ev.code);
  }, []);

  const handleError = useCallback((e: Event) => {
    console.error("[WebSocket] Error:", e);
  }, []);

  const { connected, send } = useWebSocket(wsUrl || undefined, {
    enabled: Boolean(wsUrl),
    reconnect: Boolean(wsUrl),
    onOpen: handleOpen,
    onClose: handleClose,
    onMessage: handleMessage,
    onError: handleError,
  });

  const value = useMemo(
    () => ({
      wsUrl,
      connected,
      send: send || null,
      setWsUrl,
    }),
    [wsUrl, connected, send]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within WebSocketProvider");
  }
  return context;
}
