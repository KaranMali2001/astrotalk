import { env } from '@/config/env';
import { Event_Types } from '@/constant';
import { userService } from '@/modules/user/user.service';
import { logsService } from '@/services/internal/logs.service';
import { sessionService } from '@/services/internal/session.service';
import { signJWT } from '@/utils/auth';
import logger from '@/utils/logger';
import { failure, success } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
export const testUserNumberLogin = async (phoneNumber: string, otp: string, res: Response) => {
  if (otp === env.INTERNAL_OTP) {
    const { data: user, error: userError } = await tryCatch(userService.getUserByNumber(phoneNumber));

    if (userError) {
      logger.error('Error while getting user', { error: userError });
      return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to get user');
    }
    if (!user) {
      logger.error('User not found', { phoneNumber });
      return failure(res, StatusCodes.NOT_FOUND, 'User not found');
    }
    const token = signJWT(user.id, 'USER');
    const { error: logError } = await tryCatch(
      Promise.all([
        sessionService.createSession({
          sessionToken: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userRole: 'USER',
          userId: user.id,
        }),
        logsService.createLog('TEST NUMBER LOGIN' + phoneNumber, Event_Types.LOGIN, user.id),
      ])
    );

    if (logError) {
      logger.error('Error while creating log', { error: logError });
    }
    return success(res, StatusCodes.OK, 'OTP verified successfully', { user, token });
  }
  return failure(res, StatusCodes.UNAUTHORIZED, 'Invalid OTP');
};
