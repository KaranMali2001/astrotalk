import { prisma } from '@/app';
import { CallType, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

import { env } from '@/config/env';
import { randomBytes } from 'crypto';

export function signJWT(userId: string, role: UserRole) {
  const payload = {
    userId,
    role,
    jti: randomBytes(16).toString('hex'), // unique ID for each token
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

type VerifyJWTResult =
  | {
      error: false;
      userId: string;
      role: string;
    }
  | {
      error: true;
      userId: null;
      role: null;
    };
export function signJwtForRoom(agoraChannelId: string, userId: string, role: UserRole, callId: string, professionalId: string, callType: CallType) {
  const payload = {
    professionalId,
    roomId: callId, // Use callId as roomId for consistency
    agoraRoomId: agoraChannelId, // Add agoraRoomId field for WebSocket
    userId,
    role,
    callId,
    callType, // Add callType to payload
    jti: randomBytes(16).toString('hex'), // unique ID for each token
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

  return token;
}
export function verifyJWT(token: string): VerifyJWTResult {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; role: string };

    return { error: false, userId: decoded.userId, role: decoded.role };
  } catch {
    return { error: true, userId: null, role: null };
  }
}
export function verifyInternalJWT(token: string): VerifyJWTResult {
  try {
    const decoded = jwt.verify(token, env.JWT_INTERNAL_SECRET) as { userId: string; role: string };

    return { error: false, userId: decoded.userId, role: decoded.role };
  } catch {
    return { error: true, userId: null, role: null };
  }
}
export const saveTempOtp = async (phoneNumber: string, requestId: string) => {
  return await prisma.tempOtp.create({
    data: {
      phoneNumber,
      requestId: requestId,
    },
  });
};
