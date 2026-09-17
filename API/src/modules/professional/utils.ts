import { env } from '@/config/env';
import { Event_Types } from '@/constant';
import { logsService } from '@/services/internal/logs.service';
import { sessionService } from '@/services/internal/session.service';
import { signJWT } from '@/utils/auth';
import logger from '@/utils/logger';
import { failure, success } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { profService } from './prof.service';
export const testNumberProfLogin = async (phoneNumber: string, otp: string, res: Response) => {
  if (otp === env.INTERNAL_OTP) {
    const { data: prof, error: profError } = await tryCatch(profService.getProfByNumber(phoneNumber));

    if (profError) {
      logger.error('Error while getting professional', { error: profError });
      return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to get professional');
    }
    if (!prof) {
      logger.error('Professional not found', { phoneNumber });
      return failure(res, StatusCodes.NOT_FOUND, 'Professional not found');
    }
    const token = signJWT(prof.id, 'PROFESSIONAL');
    const { error: logError } = await tryCatch(
      Promise.all([
        sessionService.createSession({
          sessionToken: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userRole: 'PROFESSIONAL',
          professionalId: prof.id,
        }),
        logsService.createLog('TEST NUMBER PROF LOGIN' + phoneNumber, Event_Types.LOGIN, prof.id),
      ])
    );

    if (logError) {
      logger.error('Error while creating log', { error: logError });
    }
    return success(res, StatusCodes.OK, 'OTP verified successfully', { prof, token });
  }
  return failure(res, StatusCodes.UNAUTHORIZED, 'Invalid OTP');
};
