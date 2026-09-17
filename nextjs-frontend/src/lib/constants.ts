// Legacy constants file - re-exports from new structure for backward compatibility
// TODO: Update all imports to use lib/config/constants and lib/types directly

export { CALL_ACCEPTANCE_TIMEOUT_SECONDS, CallState } from "./config/constants";
export type { CallStatus } from "./types/call.types";
export { WebSocketEventType } from "./types/websocket.types";
