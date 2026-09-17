// WebSocket Call System Types

export interface WebSocketConnection {
  socket: any;
  userId: string;
  role: "USER" | "PROFESSIONAL";
  roomId?: string;
  agoraRoomId?: string;
  professionalId?: string; // Add professionalId field
  callType?: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL"; // Add callType field
}

// JWT Token Structures
export interface ProfessionalSessionToken {
  userId: string; // Professional ID
  role: "PROFESSIONAL";
  jti: string; // Unique token ID
  iat: number;
  exp: number;
}

export interface RoomToken {
  roomId: string;
  userId: string;
  role: "USER" | "PROFESSIONAL";
  callId: string;
  professionalId?: string; // Add professionalId field
  callType?: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL"; // Add callType field
  jti: string;
  iat?: number;
  exp?: number;
}

// WebSocket Message Types - Incoming
export interface WSIncomingMessage {
  type: "call_request" | "accept_call" | "reject_call" | "end_call";
  data: any;
}

// WebSocket Message Types - Outgoing
export interface WSOutgoingMessage {
  type: "incoming_call" | "call_accepted" | "call_rejected" | "call_started" | "call_ended";
  data: any;
}

// Specific Message Types
export interface CallRequestMessage {
  type: "call_request";
  data: {
    callId: string;
    userId: string;
    userName: string;
  };
}

export interface AcceptCallMessage {
  type: "accept_call";
  data: {
    callId: string;
    userId: string;
  };
}

export interface RejectCallMessage {
  type: "reject_call";
  data: {
    callId: string;
    userId: string;
    reason?: string;
  };
}

export interface CallStartedMessage {
  type: "call_started";
  data: {
    agoraToken: string;
    channelId: string;
    callId: string;
  };
}

export interface IncomingCallMessage {
  type: "incoming_call";
  data: {
    callId: string;
    userId: string;
    userName: string;
    agoraChannelId: string;
    callType?: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL"; // Add callType field
  };
}

export interface CallEndedMessage {
  type: "call_ended";
  data: {
    reason: string;
    totalDuration: number;
    callId: string;
  };
}

// API Response Types
export interface StartCallResponse {
  success: boolean;
  message: string;
  data: {
    call: {
      id: string;
      userId: string;
      professionalId: string;
      status: "ONGOING";
      agoraChannelId: string;
      startTime: Date;
      maxCallDuration: number;
      user: {
        id: string;
        username: string;
      };
    };
    agoraRoomTokenForProf: string;
    agoraRoomTokenForUser: string;
  };
}

export interface EndCallResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: "COMPLETED";
    totalDuration: number;
    totalAmount: number;
    endTime: Date;
  };
}

export interface AgoraWebhookPayload {
  eventMs: number; // Numeric event code (101, 102, 103, 104, 105, 106)
  channelName: string; // Channel name
  uid: number; // User ID (numeric)
  ts: number; // Timestamp in seconds
  eventType?: string; // Sometimes included, but eventMs is more reliable
}

// Connection Manager Types
export interface ConnectionManager {
  connections: Map<string, WebSocketConnection>;
  addConnection(connection: WebSocketConnection): void;
  removeConnection(userId: string): void;
  findConnection(userId: string, role?: "USER" | "PROFESSIONAL"): WebSocketConnection | undefined;
  getConnectionsByChannel(channelId: string): WebSocketConnection[];
  broadcastProfessionalStatus(professionalId: string, isOnline: boolean): void;
}

// Environment Configuration
export interface Config {
  JWT_SECRET: string;
  WS_PORT: number;
  API_BASE_URL: string;
  AGORA_WEBHOOK_SECRET: string;
  JWT_INTERNAL_SECRET: string;
}
