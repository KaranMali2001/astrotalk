import { smsConfig } from '@/config/sms';
import logger from '@/utils/logger';
import axios from 'axios';
const url = smsConfig.url!;
const clientId = smsConfig.clientId;
const clientSecret = smsConfig.clientSecret;
export const smsService = {
  sendOtp: async (phoneNumber: string) => {
    logger.debug(`Initiating OTP request to: ${url}initiate/otp`);
    return await axios.post(
      url + 'initiate/otp',
      {
        channels: ['WHATSAPP'],
        phoneNumber: `+91${phoneNumber}`,
        otpLength: 6,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          clientId: clientId,
          clientSecret: clientSecret,
        },
      }
    );
  },
  verifyOtp: async (otp: string, requestId: string) => {
    return await axios.post(
      url + 'verify/otp',
      {
        requestId: requestId,
        otp: otp,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          clientId: clientId,
          clientSecret: clientSecret,
        },
      }
    );
  },
};
