import { env } from '@/config/env';
import { Event_Types } from '@/constant';
import { TESTNUMBERS } from '@/server';
import { smsService } from '@/services/external/sms.service';
import { logsService } from '@/services/internal/logs.service';
import { sessionService } from '@/services/internal/session.service';
import { saveTempOtp, signJWT } from '@/utils/auth';
import logger from '@/utils/logger';
import { failure, success } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userService } from './user.service';
import { cancelCallRequest, loginRequest, onboardingRequest, verifyOtpRequest } from './zod';

export async function login(req: Request, res: Response) {
  const { phoneNumber } = req.body as loginRequest;

  if (TESTNUMBERS.includes(phoneNumber)) {
    return success(res, StatusCodes.OK, 'OTP sent successfully');
  }

  if (env.ENV === 'development') {
    return success(res, StatusCodes.OK, 'OTP sent successfully', { requestId: 'test-request-id' });
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
}

export async function verifyOtp(req: Request, res: Response) {
  const { otp, requestId, phoneNumber } = req.body as verifyOtpRequest;

  let verifyOtpResponse: any, error: any;

  if (true) {
    // ✅ Use env OTP in dev
    const devOtp = env.INTERNAL_OTP;

    if (otp !== devOtp) {
      logger.warn('Invalid DEV OTP attempt', { phoneNumber, otp });
      return failure(res, StatusCodes.UNAUTHORIZED, 'Invalid OTP');
    }

    logger.info('Dev OTP verified successfully', { phoneNumber });
    verifyOtpResponse = { status: 200, data: { isOTPVerified: true } };
  } else {
    // ✅ Production flow
    ({ data: verifyOtpResponse, error } = await tryCatch(smsService.verifyOtp(otp, requestId)));

    if (error || !verifyOtpResponse) {
      logger.error('Error while verifying OTP', { error });
      return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to verify OTP');
    }
  }

  // --- OTP Verified Flow ---
  if (verifyOtpResponse?.status === 200 && verifyOtpResponse.data.isOTPVerified) {
    logger.info('OTP verified successfully', { phoneNumber });

    const { data: isExist, error: isExistError } = await tryCatch(userService.isExist(phoneNumber, requestId));

    if (isExistError) {
      logger.error('Error while checking if user exists', { error: isExistError });
      return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to check if user exists');
    }

    logger.info('User existence check completed', { phoneNumber, isExist: !!isExist });

    if (isExist) {
      logger.info('User already exists → Logging in', { phoneNumber });

      const token = signJWT(isExist.id, 'USER');

      // Check if onboarding is complete
      const { data: onboardingComplete } = await tryCatch(userService.isOnboardingComplete(isExist.id));

      const { error } = await tryCatch(
        Promise.all([
          userService.updateUser(isExist.id, new Date()),
          logsService.createLog(`User with phone number ${phoneNumber} already exists, logging in`, Event_Types.LOGIN, isExist.id),
          sessionService.createSession({
            sessionToken: token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userRole: 'USER',
            userId: isExist.id,
          }),
        ])
      );

      if (error) {
        logger.error('Error while creating session', { error });
      }

      return success(res, StatusCodes.OK, 'User logged in successfully', { 
        user: isExist, 
        token,
        onboardingComplete: onboardingComplete ?? false
      });
    }

    // --- New User Flow ---
    // Create minimal user (phone number only, no wallet) - full account creation happens during onboarding
    const { data: user, error: userError } = await tryCatch(userService.createMinimalUser(phoneNumber));

    if (userError) {
      logger.error('Error while creating minimal user', { error: userError });
      return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create user');
    }

    const token = signJWT(user.id, 'USER');

    const { error: logError } = await tryCatch(
      Promise.all([
        logsService.createLog('Minimal user created - awaiting onboarding', Event_Types.USER_CREATED, user.id),
        sessionService.createSession({
          sessionToken: token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userRole: 'USER',
          userId: user.id,
        }),
      ])
    );

    if (logError) {
      logger.error('Error while creating log and session', { error: logError });
    }

    return success(res, StatusCodes.OK, 'OTP verified successfully', { 
      user, 
      token,
      onboardingComplete: false
    });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  const userid = req.userid;

  if (!userid) {
    return failure(res, StatusCodes.UNAUTHORIZED, 'Unauthorized');
  }
  const user = await userService.getUserById(userid);

  if (!user) {
    return failure(res, StatusCodes.NOT_FOUND, 'User not found');
  }

  return success(res, StatusCodes.OK, 'User fetched successfully', user);
}

export async function cancelService(req: Request, res: Response) {
  const userid = req.userid;
  const { callId, CallType, reason } = req.body as cancelCallRequest;
  const { data, error } = await tryCatch(userService.cancelCallByUser(userid, callId, CallType, reason));

  if (error) {
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Error while canceling call');
  }
  return success(res, StatusCodes.OK, 'Call canceled successfully', data);
}

export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;

  const user = await userService.getUserById(id);

  if (!user) {
    return failure(res, StatusCodes.NOT_FOUND, 'User not found');
  }

  // logger.info('User fetched successfully', { id });

  return success(res, StatusCodes.OK, 'User fetched successfully', user);
}

export async function logout(req: Request, res: Response) {
  const userid = req.userid;

  if (!userid) {
    return failure(res, StatusCodes.UNAUTHORIZED, 'Unauthorized');
  }

  await sessionService.deleteSession(userid);

  return success(res, StatusCodes.OK, 'User logged out successfully');
}

export async function getAllUsers(req: Request, res: Response) {
  const { data: users, error } = await tryCatch(userService.getAllusers());

  if (error) {
    logger.error('Error while getting users', { error });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to get users');
  }
  return success(res, StatusCodes.OK, 'Users fetched successfully', users);
}

export async function completeOnboarding(req: Request, res: Response) {
  const userid = req.userid;

  if (!userid) {
    return failure(res, StatusCodes.UNAUTHORIZED, 'Unauthorized');
  }

  const { username, dateOfBirth, language, gender, categoryIds, relationshipGoals } = req.body as onboardingRequest;

  const { data: user, error } = await tryCatch(
    userService.completeOnboarding(userid, username, dateOfBirth, language, gender, categoryIds, relationshipGoals)
  );

  if (error) {
    logger.error('Error while completing onboarding', { error });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to complete onboarding');
  }

  return success(res, StatusCodes.OK, 'Onboarding completed successfully', user);
}

export async function registerAsProfessional(req: Request, res: Response) {
  const userid = req.userid;

  if (!userid) {
    return failure(res, StatusCodes.UNAUTHORIZED, 'Unauthorized');
  }

  // Get user phone number
  const { data: user, error: userError } = await tryCatch(userService.getUserById(userid));

  if (userError || !user) {
    logger.error('Error while getting user', { error: userError });
    return failure(res, StatusCodes.NOT_FOUND, 'User not found');
  }

  // Convert user to professional
  const { data: professional, error } = await tryCatch(
    userService.convertToProfessional(userid, user.phoneNumber)
  );

  if (error) {
    logger.error('Error while converting to professional', { error });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to convert to professional');
  }

  // Create new token for professional
  const token = signJWT(professional.id, 'PROFESSIONAL');

  // Create session for professional
  const { error: sessionError } = await tryCatch(
    Promise.all([
      sessionService.createSession({
        sessionToken: token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userRole: 'PROFESSIONAL',
        professionalId: professional.id,
      }),
      logsService.createLog('User converted to professional during onboarding', Event_Types.USER_CREATED, undefined, professional.id),
    ])
  );

  if (sessionError) {
    logger.error('Error while creating session', { error: sessionError });
  }

  return success(res, StatusCodes.OK, 'Successfully registered as professional', {
    professional,
    token,
    onboardingComplete: false,
  });
}
