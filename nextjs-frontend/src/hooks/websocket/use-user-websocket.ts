import { useWebSocket } from "../use-websocket";

export function useUserWebSocket(wsUrl: string | null | undefined) {
  return useWebSocket(wsUrl || undefined, {
    enabled: Boolean(wsUrl),
    reconnect: Boolean(wsUrl),
  });
}
