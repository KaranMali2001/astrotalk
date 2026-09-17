import { prisma } from '@/app';
import { env } from '@/config/env';
import { Event_Types, WSURL } from '@/constant';
import { callService } from '@/modules/call/call.service';
import { TESTNUMBERS } from '@/server';
import { smsService } from '@/services/external/sms.service';
import { logsService } from '@/services/internal/logs.service';
import { sessionService } from '@/services/internal/session.service';
import { saveTempOtp, signJWT } from '@/utils/auth';
import logger from '@/utils/logger';
import { failure, success } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import { CallState, CallType } from '@prisma/client';
import axios from 'axios';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { profService } from './prof.service';
import { professionalSessionService } from './prof.session.service';
import { loginRequest, onboardingRequest, registerProf, verifyOtpRequest } from './zod';
export const profLogin = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body as loginRequest;
  if (TESTNUMBERS.includes(phoneNumber)) {
    return success(res, StatusCodes.OK, 'OTP sent successfully');
  }
  if (env.ENV === 'development') {
    return success(res, StatusCodes.OK, 'OTP sent successfully', { requestId: '123456789' });
  }
  const { data: otpResponse, error } = await tryCatch(smsService.sendOtp(phoneNumber));

  if (error || !otpResponse) {
    logger.error('Error while sending OTP', { error });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to send OTP');
  }

  const { error: otpError } = await tryCatch(saveTempOtp(phoneNumber, otpResponse?.data.requestId));

  if (otpError) {
    logger.error('Error while saving OTP', { error: otpError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to send OTP');
  }

  if (otpResponse?.status === 200) {
    return success(res, StatusCodes.OK, 'OTP sent successfully', { requestId: otpResponse.data.requestId });
  }
};
export async function profverifyOtp(req: Request, res: Response) {
  const { otp, requestId, phoneNumber } = req.body as verifyOtpRequest;

  let verifyOtpResponse: any, error: any;
  if (true) {
    // ✅ Read OTP from env
    const devOtp = env.INTERNAL_OTP;

    if (otp !== devOtp) {
      logger.error('Invalid dev OTP', { otp });
      return failure(res, StatusCodes.UNAUTHORIZED, 'Invalid OTP');
    }

    logger.info('Dev OTP matched successfully');
    verifyOtpResponse = { status: 200, data: { isOTPVerified: true } };
  } else {
  }

  if (verifyOtpResponse?.status === 200 && verifyOtpResponse.data.isOTPVerified) {
    logger.info('OTP verified successfully');

    const { data: isExist, error: isExistError } = await tryCatch(profService.isProfExist(phoneNumber, requestId));

    if (isExistError) {
      logger.error('Error while checking if user exists', { error: isExistError });
      return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to check if user exists');
    }

    if (!isExist) {
      const prof = await profService.createProf(phoneNumber, phoneNumber, 'PROFESSIONAL TEST LOGIN', phoneNumber || '');

      const token = signJWT(prof.id, 'PROFESSIONAL');

      const { error } = await tryCatch(
        Promise.all([
          profService.updateProf(prof.id, new Date()),
          sessionService.createSession({
            sessionToken: token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userRole: 'PROFESSIONAL',
            userId: prof.id,
          }),
        ])
      );

      return success(res, StatusCodes.OK, `Prof created successfully`, {
        prof,
        token,
        onboardingComplete: false,
      });
    }

    if (isExist) {
      logger.info('Prof exists');

      const token = signJWT(isExist.id, 'PROFESSIONAL');

      // Check if onboarding is complete
      const { data: onboardingComplete } = await tryCatch(profService.isOnboardingComplete(isExist.id));

      const { error } = await tryCatch(
        Promise.all([
          profService.updateProf(isExist.id, new Date()),
          sessionService.createSession({
            sessionToken: token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userRole: 'PROFESSIONAL',
            professionalId: isExist.id,
          }),
        ])
      );

      if (error) {
        logger.error('Error while creating session', { error });
      }

      return success(res, StatusCodes.OK, `Prof logged in successfully`, {
        prof: isExist,
        token,
        onboardingComplete: onboardingComplete ?? false,
      });
    }
  }
}

export async function profRegister(req: Request, res: Response) {
  const { phoneNumber, name, about_me, email, requestId, otp } = req.body as registerProf;
  const { data: verifyOtpResponse, error } = await tryCatch(smsService.verifyOtp(otp, requestId));

  if (error || !verifyOtpResponse) {
    logger.error('Error while verifying OTP', { error });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to verify OTP');
  }

  if (verifyOtpResponse?.status === 200 && verifyOtpResponse.data.isOTPVerified) {
    const { data: prof, error: profError } = await tryCatch(profService.createProf(phoneNumber, name, about_me || 'PROFESSIONAL', email || ''));
    if (profError) {
      logger.error('Error while creating professional', { error: profError });
      return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, profError.message);
    }

    const token = signJWT(prof.id, 'PROFESSIONAL');
    const { error } = await tryCatch(
      Promise.all([
        logsService.createLog('Professional created', Event_Types.USER_CREATED, prof.id),
        sessionService.createSession({
          sessionToken: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userRole: 'PROFESSIONAL',
          professionalId: prof.id,
        }),
      ])
    );

    if (error) {
      logger.error('Error while creating session and log', { error });
    }

    return success(res, StatusCodes.OK, 'Professional created successfully', { prof, token });
  }
}
export async function profPending(req: Request, res: Response) {
  const userid = req.userid;
  const data = await profService.getPending(userid);

  return success(res, StatusCodes.OK, 'Pending professionals fetched successfully', data);
}
export async function profInfo(req: Request, res: Response) {
  const userid = req.userid;
  const prof = await profService.getProfInfo(userid);
  return success(res, StatusCodes.OK, 'Professional info fetched successfully', { prof });
}
export async function closeSession(req: Request, res: Response) {
  const professionalId = req.params.id;
  const { data, error } = await tryCatch(professionalSessionService.endSession(professionalId));
  if (error) {
    console.error('Error closing session', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }
  return success(res, StatusCodes.OK, 'Session closed successfully');
}
export async function toggleSession(req: Request, res: Response) {
  const professionalId = req.userid;

  const { data: sessionData, error } = await tryCatch(professionalSessionService.toggleSession(professionalId));

  if (error) {
    logger.error('Error toggling session', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }

  const isActive = sessionData.isActive;
  const message = isActive ? 'Session started successfully' : 'Session ended successfully';

  return success(res, StatusCodes.OK, message, {
    session: sessionData,
    professional: { isActive },
    ws: isActive ? `${WSURL}/ws?token=${sessionData.sessionToken}` : null,
  });
}

export async function getSessionStatus(req: Request, res: Response) {
  const professionalId = req.userid;

  const { data: activeSession, error } = await tryCatch(professionalSessionService.getActiveSession(professionalId));

  if (error) {
    logger.error('Error getting session status', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }

  const { data: stats, error: statsError } = await tryCatch(professionalSessionService.getSessionStats(professionalId));

  if (statsError) {
    logger.error('Error getting session stats', { error: statsError, professionalId });
  }

  return success(res, StatusCodes.OK, 'Session status fetched successfully', {
    activeSession,
    stats: stats || { totalSessions: 0, totalMinutes: 0, totalRewards: 0 },
  });
}

export async function getSessionHistory(req: Request, res: Response) {
  const professionalId = req.userid;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data: sessions, error } = await tryCatch(professionalSessionService.getSessionHistory(professionalId, limit, offset));

  if (error) {
    logger.error('Error getting session history', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }

  return success(res, StatusCodes.OK, 'Session history fetched successfully', { sessions });
}

export async function endCall(req: Request, res: Response) {
  const professionalId = req.userid;
  const { callId } = req.body as { callId: string };

  if (!callId) {
    return failure(res, StatusCodes.BAD_REQUEST, 'Call ID is required');
  }

  const { data: call, error: callError } = await tryCatch(
    prisma.call.findFirst({
      where: {
        id: callId,
        professionalId: professionalId,
      },
      include: {
        user: { include: { wallet: true } },
        professional: { include: { wallet: true } },
      },
    })
  );

  if (callError || !call) {
    logger.error('Error finding call', { error: callError, callId, professionalId });
    return failure(res, StatusCodes.NOT_FOUND, 'Call not found');
  }

  // If call already ended, return success
  if (
    call.callState === CallState.CALL_END ||
    call.callState === CallState.CALL_CANCELLED ||
    call.callState === CallState.CHAT_CANCELLED ||
    call.callState === CallState.CALL_REJECTED ||
    call.callState === CallState.CHAT_REJECTED
  ) {
    return success(res, StatusCodes.OK, 'Call already ended', { call });
  }

  // If call hasn't started, mark it as cancelled
  if (call.callState === CallState.CALL_INITIATED) {
    const cancelledState = call.type === CallType.CHAT ? CallState.CHAT_CANCELLED : CallState.CALL_CANCELLED;

    const { data: updatedCall, error: updateError } = await tryCatch(
      prisma.call.update({
        where: { id: callId },
        data: {
          callState: cancelledState,
          callEnd: new Date(),
          user: {
            update: {
              isInCall: false,
            },
          },
          professional: {
            update: {
              isInCall: false,
            },
          },
        },
        include: {
          user: { include: { wallet: true } },
          professional: { include: { wallet: true } },
        },
      })
    );

    if (updateError) {
      logger.error('Error cancelling call', { error: updateError, callId });
      return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to cancel call');
    }

    logsService.createLog(
      `Call cancelled by professional ${professionalId} for call ${callId}`,
      Event_Types.CALL_CANCELLED,
      call.userId,
      null,
      professionalId
    );

    return success(res, StatusCodes.OK, 'Call cancelled successfully', { call: updatedCall });
  }

  // If call has started, use the existing endService logic
  if (call.callState === CallState.CALL_START) {
    const { data: endedCall, error: endError } = await tryCatch(callService.endService(callId));

    if (endError || !endedCall) {
      logger.error('Error ending call', { error: endError, callId });
      return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to end call');
    }

    // Notify both parties via WebSocket
    try {
      const wsNotifyUrl = `${WSURL}/internal/notify-call-ended`;
      await axios.post(
        wsNotifyUrl,
        {
          channelId: endedCall.agoraChannelId,
          callId: endedCall.id,
          userId: endedCall.userId,
          professionalId: endedCall.professionalId,
          reason: 'call_ended_manually',
          totalDuration: endedCall.callDuration || 0,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': env.JWT_INTERNAL_SECRET,
          },
        }
      );
      logger.info('WebSocket notification sent for call end', { callId: endedCall.id });
    } catch (wsError) {
      // Log error but don't fail the request - call is already ended in DB
      logger.error('Failed to send WebSocket notification', { error: wsError, callId: endedCall.id });
    }

    return success(res, StatusCodes.OK, 'Call ended successfully', { call: endedCall });
  }

  return failure(res, StatusCodes.BAD_REQUEST, 'Call cannot be ended in current state');
}

export async function completeOnboarding(req: Request, res: Response) {
  const professionalId = req.userid;

  if (!professionalId) {
    return failure(res, StatusCodes.UNAUTHORIZED, 'Unauthorized');
  }

  const { name, dateOfBirth, gender, voiceRecording, categoryIds } = req.body as onboardingRequest;

  const { data: professional, error } = await tryCatch(
    profService.completeOnboarding(professionalId, name, dateOfBirth, gender, voiceRecording, categoryIds)
  );

  if (error) {
    logger.error('Error while completing onboarding', { error });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to complete onboarding');
  }

  return success(res, StatusCodes.OK, 'Onboarding completed successfully', professional);
}
