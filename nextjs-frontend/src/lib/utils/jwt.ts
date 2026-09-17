import { getToken } from "@/lib/auth";

// Maximum JWT payload size to prevent stack overflow (10KB is reasonable for JWT payloads)
const MAX_JWT_PAYLOAD_SIZE = 10 * 1024;

/**
 * Safely decodes a base64url string to UTF-8
 * Replaces deprecated escape() with a safer approach
 */
function base64UrlDecode(str: string): string {
  // Add padding if needed
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  
  try {
    // Use TextDecoder for safer UTF-8 decoding from base64
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    // Fallback for older browsers or edge cases
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  }
}

export function decodeJwt(token: string): unknown | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    if (!payload) {
      return null;
    }

    // Validate payload size to prevent stack overflow
    if (payload.length > MAX_JWT_PAYLOAD_SIZE) {
      console.warn("JWT payload exceeds maximum size, rejecting");
      return null;
    }

    const json = base64UrlDecode(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getProfessionalIdFromAuth(): string | null {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const payload = decodeJwt(token) as any;
    // Auth token has userId which is the professional's ID
    const professionalId = payload?.userId || null;

    return professionalId;
  } catch (error) {
    return null;
  }
}

export function getUserIdFromAuth(): string | null {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const payload = decodeJwt(token) as any;
    // Auth token has userId which is the user's ID
    const userId = payload?.userId || null;

    return userId;
  } catch (error) {
    return null;
  }
}

export function extractDataFromWsUrl(wsUrl: string | null): { userId: string | null; callId: string | null; callType: "CHAT" | "AUDIO_CALL" | "VIDEO_CALL" | null; professionalId: string | null } {
  if (!wsUrl) {
    return { userId: null, callId: null, callType: null, professionalId: null };
  }

  try {
    const url = new URL(wsUrl);
    const token = url.searchParams.get("token");
    if (!token) {
      return { userId: null, callId: null, callType: null, professionalId: null };
    }

    // Decode JWT token using base64url-safe decoding (same as decodeJwt)
    const payloadPart = token.split(".")[1];
    if (!payloadPart) {
      return { userId: null, callId: null, callType: null, professionalId: null };
    }

    // Validate payload size to prevent stack overflow
    if (payloadPart.length > MAX_JWT_PAYLOAD_SIZE) {
      console.warn("JWT payload exceeds maximum size, rejecting");
      return { userId: null, callId: null, callType: null, professionalId: null };
    }

    // Use the safe base64url decoder
    const json = base64UrlDecode(payloadPart);
    const payload = JSON.parse(json);

    return {
      userId: payload.userId || null,
      callId: payload.callId || null,
      callType: payload.callType || null,
      professionalId: payload.professionalId || null,
    };
  } catch (error) {
    return { userId: null, callId: null, callType: null, professionalId: null };
  }
}

export function extractWsToken(wsUrl: string): string | null {
  try {
    const query = wsUrl.split("?")[1] || "";
    const m = query.match(/token[-=]([^&]+)/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
