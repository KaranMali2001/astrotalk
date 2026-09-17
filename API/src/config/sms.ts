import { env } from './env';

export const smsConfig = {
  url: env.OTP_SERVICE_URL,
  clientId: env.OTP_SERVICE_CLIENT_ID,
  clientSecret: env.OTP_SERVICE_CLIENT_SECRET,
};
