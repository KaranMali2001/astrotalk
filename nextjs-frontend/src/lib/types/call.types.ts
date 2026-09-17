export interface CallStartedData {
  agoraToken: string;
  channelId: string;
  callId: string;
}

export interface IncomingCallData {
  callId: string;
  userId: string;
  userName: string;
  agoraChannelId: string;
  userAvatar?: string;
  callType?: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL"; // Add callType field
}

export type CallStatus = "waiting" | "initiated" | "started" | "in_call" | "ended" | "rejected";

export interface PendingCall {
  id: string;
  userId: string;
  professionalId: string;
  callState: CallState;
  callDuration: number; // seconds
  totalCharge: number; // paise
  callStart?: string | null; // ISO
  callEnd?: string | null; // ISO
  rate: number;
  type: CallType;
  maxCallDuration: number;
  agoraChannelId: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reasonToReject?: string | null;
  user: PendingCallUser;
}

// Backend database enum values (from API/prisma/schema/enum.prisma)
export type CallState =
  | "IDLE"
  | "RINGING"
  | "ACTIVE"
  | "ENDED"
  | "REJECTED"
  | "CALL_INITIATED"
  | "CALL_START"
  | "CALL_END"
  | "CALL_CANCELLED"
  | "CALL_REJECTED"
  | "CHAT_REJECTED"
  | "CHAT_CANCELLED"
  | "BILLING_PROCESSED";
export type CallType = "AUDIO" | "VIDEO";

export interface PendingCallUser {
  username: string | null;
  id: string;
}
