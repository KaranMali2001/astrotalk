import axios from "axios";
import jwt from "jsonwebtoken";
import { config } from "./config";
import wsLogger from "./logger";
import { EndCallResponse, ProfessionalSessionToken, RoomToken, StartCallResponse } from "./types";
export const logger = wsLogger;
// JWT Token verification functions
export function verifyToken(token: string): ProfessionalSessionToken | RoomToken | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;

    // Validate required fields based on token structure
    if (!decoded.userId || !decoded.role) {
      logger.error("Invalid token structure");
      return null;
    }

    // For room tokens (containing roomId/callId)
    if (decoded.roomId || decoded.callId) {
      return {
        userId: decoded.userId,
        role: decoded.role,
        roomId: decoded.roomId || decoded.callId,
        callId: decoded.callId || decoded.roomId,
        professionalId: decoded.professionalId, // Add professionalId field
        callType: decoded.callType, // Add callType field
        jti: decoded.jti,
        iat: decoded.iat,
        exp: decoded.exp,
      } as RoomToken;
    }

    // For professional session tokens
    return {
      userId: decoded.userId,
      role: decoded.role,
      jti: decoded.jti,
      iat: decoded.iat,
      exp: decoded.exp,
    } as ProfessionalSessionToken;
  } catch (error) {
    logger.error("Token verification failed");
    return null;
  }
}

// API call functions
export async function startCallAPI(profId: string, userId: string, callId: string): Promise<StartCallResponse> {
  try {
    const response = await axios.post(
      `${config.API_BASE_URL}/api/v1/call/start-call`,
      { profId, userId, callId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.JWT_INTERNAL_SECRET}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error("Start call API failed");
    throw error;
  }
}

export async function endCallAPI(channelName: string): Promise<EndCallResponse> {
  try {
    const response = await axios.post(
      `${config.API_BASE_URL}/api/v1/call/end-call`,
      { channelName },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.JWT_INTERNAL_SECRET}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error("End call API failed");
    throw error;
  }
}

export async function rejectCallAPI(callId: string, profId: string, reason?: string): Promise<any> {
  console.log("CALLID", callId);
  try {
    const response = await axios.post(
      `${config.API_BASE_URL}/api/v1/call/reject-call`,
      { callId, profId, reason },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.JWT_INTERNAL_SECRET}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error("Reject call API failed", callId);
    throw error;
  }
}

// Helper functions for call management
export async function getCallInfoByChannel(channelId: string): Promise<any> {
  try {
    const response = await axios.get(`${config.API_BASE_URL}/api/v1/call/by-channel/${channelId}`, {
      headers: {
        Authorization: `Bearer ${config.JWT_INTERNAL_SECRET}`,
      },
    });
    return response.data;
  } catch (error) {
    logger.error("Get call info failed");
    return null;
  }
}

export async function getCallInfoById(callId: string): Promise<any> {
  try {
    // We'll need to add this endpoint or use the existing one
    // For now, let's try to get it from the database via an internal endpoint
    // Since we don't have a direct endpoint, we'll need to pass the info from API
    return null;
  } catch (error) {
    logger.error("Get call info by ID failed");
    return null;
  }
}

export async function getUserName(userId: string): Promise<string> {
  try {
    const response = await axios.get(`${config.API_BASE_URL}/api/v1/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${config.JWT_INTERNAL_SECRET}`,
      },
    });
    return response.data?.name || "Unknown User";
  } catch (error) {
    logger.error("Get user name failed");
    return "Unknown User";
  }
}

export function getProfessionalIdFromCall(callId: string): string | null {
  const [ids, timestamp] = callId.split(" "); // split by space
  const [userId, profId] = ids.split("_"); // split by underscore
  return profId;
}

// Webhook signature verification
export async function closeProfessionalSessionAPI(professionalId: string): Promise<any> {
  try {
    const response = await axios.post(
      `${config.API_BASE_URL}/api/v1/professional/session/close/${professionalId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.JWT_INTERNAL_SECRET}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    logger.error("Close session API failed");
    throw error;
  }
}

export function verifySignature(signature: string, body: string, secret: string): boolean {
  try {
    const crypto = require("crypto");
    const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");

    return signature === expectedSignature;
  } catch (error) {
    logger.error("Signature verification failed");
    return false;
  }
}
