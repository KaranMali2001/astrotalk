"use client";

import { useWebSocket } from "@/hooks/use-websocket";
import { api, wsBaseURL } from "@/lib/api";
import { WebSocketEventType } from "@/lib/constants";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface IncomingCallData {
  callId: string;
  userId: string;
  userName: string;
  agoraChannelId: string;
  userAvatar?: string;
  callType?: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL"; // Add callType field
}

interface CallStartedData {
  agoraToken: string;
  channelId: string;
  callId: string;
}

interface ProfWebSocketContextType {
  wsUrl: string | null;
  connected: boolean;
  send: ((payload: any) => boolean) | null;
  incomingCall: IncomingCallData | null;
  callTokens: CallStartedData | null;
  setIncomingCall: (call: IncomingCallData | null) => void;
  setCallTokens: (tokens: CallStartedData | null) => void;
  setWsUrl: (url: string | null) => void;
  refreshSessionStatus: () => Promise<void>;
}

const ProfWebSocketContext = createContext<ProfWebSocketContextType | null>(null);

export function ProfWebSocketProvider({ children }: { children: ReactNode }) {
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [callTokens, setCallTokens] = useState<CallStartedData | null>(null);
  const processedCallIdsRef = useRef<Set<string>>(new Set());
  const isRefreshingRef = useRef(false);

  const handleMessage = useCallback((data: any) => {
    console.log("[ProfWebSocket] Message received:", data);

    if (data.type === WebSocketEventType.INCOMING_CALL && data.data) {
      const callId = data.data.callId;

      // Prevent duplicate notifications
      if (processedCallIdsRef.current.has(callId)) {
        console.log("[ProfWebSocket] Duplicate incoming_call message ignored for callId:", callId);
        return;
      }

      processedCallIdsRef.current.add(callId);
      console.log("[ProfWebSocket] Setting incoming call data:", data.data);
      setIncomingCall(data.data);
    } else if (data.type === WebSocketEventType.CALL_STARTED && data.data) {
      const tokens = data.data;
      setCallTokens(tokens);
      setIncomingCall(null);
    } else if (data.type === WebSocketEventType.CALL_ENDED && data.data) {
      // Call ended - clear call tokens and incoming call
      console.log("[ProfWebSocket] Call ended:", data.data);
      setCallTokens(null);
      setIncomingCall(null);
      // Clear processed call IDs for this call
      if (data.data.callId) {
        processedCallIdsRef.current.delete(data.data.callId);
      }
    }
  }, []);

  // Memoize callbacks to prevent recreation
  const handleOpen = useCallback(() => {
    console.log("[ProfWebSocket] Connected");
  }, []);

  const handleClose = useCallback(
    (ev: CloseEvent) => {
      console.log("[ProfWebSocket] Closed with code:", ev.code);
      if (!wsUrl && ev.code === 1000) {
        console.log("[ProfWebSocket] Session ended cleanly");
      }
    },
    [wsUrl]
  );

  const handleError = useCallback((e: Event) => {
    console.error("[ProfWebSocket] Error:", e);
  }, []);

  const { connected, send } = useWebSocket(wsUrl || undefined, {
    enabled: Boolean(wsUrl),
    reconnect: Boolean(wsUrl),
    onOpen: handleOpen,
    onClose: handleClose,
    onMessage: handleMessage,
    onError: handleError,
  });

  const refreshSessionStatus = useCallback(async () => {
    // Prevent multiple simultaneous refreshes
    if (isRefreshingRef.current) {
      console.log("[ProfWebSocket] Refresh already in progress, skipping");
      return;
    }

    try {
      isRefreshingRef.current = true;
      const response = await api.get<{
        success: boolean;
        data: {
          activeSession: {
            isActive: boolean;
            sessionToken?: string;
          } | null;
        };
      }>("api/v1/professional/session/status");

      if (response.data.success && response.data.data) {
        const activeSession = response.data.data.activeSession;

        // Only connect/update WebSocket if session is active
        // Once connected, keep it connected - don't disconnect on call end
        if (activeSession?.isActive && activeSession.sessionToken) {
          const newWsUrl = `${wsBaseURL}/ws?token=${activeSession.sessionToken}`;

          // Only update if we don't have a connection yet
          // Once connected, keep it connected - don't reconnect unnecessarily
          setWsUrl((currentUrl) => {
            if (!currentUrl) {
              console.log("[ProfWebSocket] Initializing WebSocket connection:", newWsUrl);
              return newWsUrl;
            }
            // If we already have a connection, keep it - don't change it
            // Only update if the token actually changed (session was recreated)
            if (currentUrl !== newWsUrl) {
              // Extract tokens to compare
              const currentToken = currentUrl.split("token=")[1];
              const newToken = newWsUrl.split("token=")[1];
              if (currentToken !== newToken) {
                console.log("[ProfWebSocket] Updating WebSocket URL (session token changed):", newWsUrl);
                return newWsUrl;
              }
            }
            // Keep existing connection - don't reconnect
            return currentUrl;
          });
        } else {
          // Keep connection persistent - don't disconnect even if session status is unclear
          // Once connected, maintain the connection
          setWsUrl((currentUrl) => {
            if (currentUrl) {
              console.log("[ProfWebSocket] Keeping existing WebSocket connection persistent");
              return currentUrl;
            }
            // Only return null if we never had a connection
            return null;
          });
        }
      }
    } catch (err) {
      console.error("[ProfWebSocket] Error refreshing session status:", err);
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // Initial session status fetch on mount
  useEffect(() => {
    refreshSessionStatus();
  }, [refreshSessionStatus]);

  const value = useMemo(
    () => ({
      wsUrl,
      connected,
      send: send || null,
      incomingCall,
      callTokens,
      setIncomingCall,
      setCallTokens,
      setWsUrl,
      refreshSessionStatus,
    }),
    [wsUrl, connected, send, incomingCall, callTokens, refreshSessionStatus]
  );

  return <ProfWebSocketContext.Provider value={value}>{children}</ProfWebSocketContext.Provider>;
}

export function useProfWebSocket() {
  const context = useContext(ProfWebSocketContext);
  if (!context) {
    throw new Error("useProfWebSocket must be used within ProfWebSocketProvider");
  }
  return context;
}
