'use client';

import { useEffect, useRef, useState } from 'react';

export interface UseWebSocketOptions {
  enabled?: boolean;
  onMessage?: (data: any, raw: MessageEvent) => void;
  onOpen?: (ev: Event) => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
  // simple reconnect policy
  reconnect?: boolean;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(wsUrl?: string | null, opts: UseWebSocketOptions = {}) {
  const { enabled = true, onMessage, onOpen, onClose, onError, reconnect = true, reconnectDelayMs = 3000, maxReconnectAttempts = Infinity } = opts;

  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  // Use refs for callbacks to avoid recreating connection when callbacks change
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (!wsUrl || !enabled) return;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = (ev) => {
          if (cancelled) return;
          attemptsRef.current = 0;
          setConnected(true);
          onOpenRef.current?.(ev);
        };

        ws.onmessage = (ev) => {
          if (cancelled) return;
          try {
            const data = JSON.parse(ev.data);
            setLastMessage(data);
            onMessageRef.current?.(data, ev);
          } catch {
            setLastMessage(ev.data);
            onMessageRef.current?.(ev.data, ev);
          }
        };

        ws.onclose = (ev) => {
          if (cancelled) return;
          setConnected(false);
          onCloseRef.current?.(ev);
          
          // Reconnect indefinitely if enabled and not a clean close (code 1000)
          if (reconnect && ev.code !== 1000) {
            attemptsRef.current += 1;
            const attemptLabel = maxReconnectAttempts === Infinity ? '∞' : `${attemptsRef.current}/${maxReconnectAttempts}`;
            console.log(`WebSocket closed (code: ${ev.code}), attempting reconnect ${attemptLabel}`);
            timeoutRef.current = setTimeout(connect, reconnectDelayMs);
          } else if (ev.code === 1000) {
            console.log('WebSocket closed cleanly, not reconnecting');
          } else if (maxReconnectAttempts !== Infinity && attemptsRef.current >= maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
          }
        };

        ws.onerror = (ev) => {
          onErrorRef.current?.(ev);
        };
      } catch (e) {
        if (reconnect && (maxReconnectAttempts === Infinity || attemptsRef.current < maxReconnectAttempts)) {
          attemptsRef.current += 1;
          timeoutRef.current = setTimeout(connect, reconnectDelayMs);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      
      // Clear any pending reconnection timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Component unmounting'); // Clean close
        } catch {}
        wsRef.current = null;
      }
    };
  }, [wsUrl, enabled, reconnect, reconnectDelayMs, maxReconnectAttempts]);

  const send = (payload: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    return true;
  };

  return { connected, lastMessage, send };
}
