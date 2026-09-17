import { env } from '@/config/env';
import logger from '@/utils/logger';
import agoraToken from 'agora-token';
import axios from 'axios';
import crypto from 'crypto';

const { RtcTokenBuilder, RtcRole } = agoraToken;
const DEFAULT_BAN_SECONDS = 900; // 15 minutes safeguard against rejoin
export const agoraService = {
  generateTokenWithDuration: (channelName: string, duration: number, userId: string) => {
    const maxDurationInSeconds = Math.min(duration * 60 * 20, 86400);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expireTime = currentTimestamp + maxDurationInSeconds;

    const numericUid = generateDeterministicUid(userId);

    return RtcTokenBuilder.buildTokenWithUid(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      channelName,
      numericUid,
      RtcRole.PUBLISHER,
      expireTime,
      expireTime
    );
  },
  generateChannelId: (userId: string, professionalId: string, jist: number) => {
    const combined = `${userId}${professionalId}${jist}`;
    return crypto.createHash('md5').update(combined).digest('hex').substring(0, 32);
  },
  generateRtcUid: (userId: string) => generateDeterministicUid(userId),
  invalidateChannelParticipants: async (channelName: string, userIds: string[], banSeconds: number = DEFAULT_BAN_SECONDS) => {
    if (userIds.length === 0) {
      return;
    }

    const auth = Buffer.from(`${env.AGORA_CUSTOMER_ID}:${env.AGORA_CUSTOMER_SECRET}`).toString('base64');
    const url = `${env.AGORA_REST_BASE_URL}/dev/v1/kicking-rule`;

    for (const id of userIds) {
      const uid = generateDeterministicUid(id);
      try {
        await axios.post(
          url,
          {
            appid: env.AGORA_APP_ID,
            cname: channelName,
            uid: uid.toString(),
            time: banSeconds,
          },
          {
            timeout: env.AGORA_REST_TIMEOUT_MS,
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        logger.warn('Failed to invalidate Agora participant', {
          channelName,
          uid,
          error,
        });
      }
    }
  },
};
function generateDeterministicUid(userId: string): number {
  let hash = 0;

  // Create hash from userId string
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Ensure positive number within Agora's UID range (0 to 2^32-1)
  const uid = Math.abs(hash) % 2147483647;

  // Ensure it's never 0 (some Agora SDKs treat 0 as special)
  return uid === 0 ? 1 : uid;
}
