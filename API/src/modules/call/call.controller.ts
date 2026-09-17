import { Event_Types, WSURL } from '@/constant';
import { agoraService } from '@/services/external/agora.service';
import { websocketService } from '@/services/external/websocket.service';
import { logsService } from '@/services/internal/logs.service';
import { signJwtForRoom } from '@/utils/auth';
import logger from '@/utils/logger';
import { failure, success } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import { CallType } from '@prisma/client';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { profService } from '../professional/prof.service';
import { userService } from '../user/user.service';
import { callService } from './call.service';
import { CancelCallRequest, EndServiceRequest, InitiateServiceRequest, RejectServiceRequest, StartServiceRequest } from './zod';
export const browseProfessionals = async (req: Request, res: Response) => {
  const query = req.query.query as string | undefined;
  const professionals = await callService.browseProfessionals(query);

  return success(res, StatusCodes.OK, 'Professionals fetched successfully', professionals);
};
export const initiateChat = async (req: Request, res: Response) => {
  const userId = req.userid;
  const { professionalId } = req.body as InitiateServiceRequest;
  //fetch professional
  const { data: getProf, error: getProfError } = await tryCatch(profService.getProfInfo(professionalId));
  if (getProfError || !getProf || getProf.isVerified === false) {
    logger.error('Error while getting professional', { error: getProfError });
    return failure(res, StatusCodes.NOT_FOUND, 'Professional not found');
  }
  //fetch user
  const { data: user, error: getUserError } = await tryCatch(userService.getUserById(userId));
  if (getUserError || !user) {
    logger.error('Error while getting user', { error: getUserError });
    return failure(res, StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user.wallet?.totalBalence! < getProf.perMinuteRateChat) {
    return failure(res, StatusCodes.FORBIDDEN, 'Insufficient balance');
  }
  const { data: chat, error: chatError } = await tryCatch(
    callService.initiateService(userId, professionalId, getProf.perMinuteRateChat, CallType.CHAT, user.wallet?.totalBalence!)
  );
  if (chatError || !chat) {
    logger.error('Error while initiating chat', { error: chatError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to initiate chat');
  }
  const token = signJwtForRoom(chat.agoraChannelId, userId, 'USER', chat.id, chat.professionalId, CallType.CHAT);
  return success(res, StatusCodes.OK, 'Chat initiated successfully', { chat, ws: `${WSURL}/ws?token=${token}` });
};
export const startChat = async (req: Request, res: Response) => {
  const { profId, userId } = req.body as StartServiceRequest;
  const { data: chat, error: chatError } = await tryCatch(callService.startService(profId, userId));
  if (chatError || !chat) {
    logger.error('Error while initiating chat', { error: chatError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to initiate chat');
  }
  const agoraRoomTokenForProf = agoraService.generateTokenWithDuration(chat.agoraChannelId, chat.maxCallDuration, profId);
  const agoraRoomTokenForUser = agoraService.generateTokenWithDuration(chat.agoraChannelId, chat.maxCallDuration, userId);
  logsService.createLog(`chat accepted by Professional ID ${profId}`, Event_Types.CHAT_STARTED, chat.user.id, null, profId);
  return success(res, StatusCodes.OK, 'Chat initiated successfully', { chat, agoraRoomTokenForProf, agoraRoomTokenForUser });
};

export const endChat = async (req: Request, res: Response) => {
  const { channelName } = req.body as EndServiceRequest;
  const { data: chat, error: chatError } = await tryCatch(callService.endService(channelName));
  if (chatError || !chat) {
    logger.error('Error while ending chat', { error: chatError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to end chat');
  }
  logsService.createLog(
    `chat ended by b/w ${chat.professionalId} and ${chat.userId}`,
    Event_Types.CHAT_ENDED,
    chat.user.id,
    null,
    chat.professionalId
  );
  return success(res, StatusCodes.OK, 'Chat ended successfully', chat);
};
export const initiateCall = async (req: Request, res: Response) => {
  const userId = req.userid;
  const { professionalId } = req.body as InitiateServiceRequest;
  //fetch professional
  const { data: getProf, error: getProfError } = await tryCatch(profService.getProfInfo(professionalId));
  if (getProfError || !getProf || getProf.isVerified === false) {
    logger.error('Error while getting professional', { error: getProfError });
    return failure(res, StatusCodes.NOT_FOUND, 'Professional not found');
  }
  //fetch user
  const { data: user, error: getUserError } = await tryCatch(userService.getUserById(userId));
  if (getUserError || !user) {
    logger.error('Error while getting user', { error: getUserError });
    return failure(res, StatusCodes.NOT_FOUND, 'User not found');
  }
  if (user.wallet?.totalBalence! < getProf.perMinuteRateCall) {
    return failure(res, StatusCodes.FORBIDDEN, 'Insufficient balance');
  }
  const { data: call, error: callError } = await tryCatch(
    callService.initiateService(userId, professionalId, getProf.perMinuteRateCall, CallType.AUDIO_CALL, user.wallet?.totalBalence!)
  );
  if (callError || !call) {
    logger.error('Error while initiating call', { error: callError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to initiate call');
  }
  const token = signJwtForRoom(call.agoraChannelId, userId, 'USER', call.id, call.professionalId, CallType.AUDIO_CALL);
  return success(res, StatusCodes.OK, 'Call initiated successfully', { call, ws: `${WSURL}/ws?token=${token}` });
};
export const startService = async (req: Request, res: Response) => {
  const { callId, profId, userId } = req.body as StartServiceRequest;

  const { data: call, error: callError } = await tryCatch(callService.startService(profId, userId));
  if (callError || !call) {
    logger.error('Error while starting call', { error: callError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to start call');
  }
  const agoraRoomTokenForProf = agoraService.generateTokenWithDuration(call.agoraChannelId, call.maxCallDuration, profId);
  const agoraRoomTokenForUser = agoraService.generateTokenWithDuration(call.agoraChannelId, call.maxCallDuration, userId);
  logsService.createLog(`call accepted by Professional ID ${profId}`, Event_Types.CALL_STARTED, call.user.id, null, profId);
  return success(res, StatusCodes.OK, 'Call started successfully', { call, agoraRoomTokenForProf, agoraRoomTokenForUser });
};
export const rejectService = async (req: Request, res: Response) => {
  const { callId, profId, reason } = req.body as RejectServiceRequest;
  const { data: call, error: callError } = await tryCatch(callService.rejectService(callId, profId, reason));
  if (callError || !call) {
    logger.error('Error while rejecting call', { error: callError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to reject call');
  }
  logsService.createLog(`call rejected by Professional ID ${profId}`, Event_Types.CALL_REJECTED, call.user.id, null, profId);
  return success(res, StatusCodes.OK, 'Call rejected successfully', { call });
};
export const endService = async (req: Request, res: Response) => {
  const { channelName } = req.body as EndServiceRequest;

  const { data: call, error: callError } = await tryCatch(callService.endService(channelName));

  if (callError) {
    logger.error('Error while ending call', { error: callError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to end call');
  }
  if (!call) {
    logger.info('Call not found', { channelName });
    return failure(res, StatusCodes.NOT_FOUND, 'Call not found');
  }
  if (call?.callDuration || call?.callEnd) {
    logsService.createLog(
      `call ended by b/w ${call.professionalId} and ${call.userId}`,
      Event_Types.CALL_ENDED,
      call.user.id,
      null,
      call.professionalId
    );
    return success(res, StatusCodes.OK, 'Call already processed');
  }

  // Notify both parties via WebSocket
  await websocketService.notifyCallEnded({
    channelId: call.agoraChannelId,
    callId: call.id,
    userId: call.userId,
    professionalId: call.professionalId,
    reason: 'call_ended_manually',
    totalDuration: call.callDuration || 0,
  });

  return success(res, StatusCodes.OK, 'Call ended successfully', { call });
};

export const getUserCallHistory = async (req: Request, res: Response) => {
  const userId = req.userid;
  const { data: callHistory, error: historyError } = await tryCatch(callService.getUserCallHistory(userId));

  if (historyError) {
    logger.error('Error while fetching user call history', { error: historyError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to fetch call history');
  }

  return success(res, StatusCodes.OK, 'Call history fetched successfully', callHistory);
};

export const getProfessionalCallHistory = async (req: Request, res: Response) => {
  const professionalId = req.userid;
  const { data: callHistory, error: historyError } = await tryCatch(callService.getProfessionalCallHistory(professionalId));

  if (historyError) {
    logger.error('Error while fetching professional call history', { error: historyError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to fetch call history');
  }

  return success(res, StatusCodes.OK, 'Call history fetched successfully', callHistory);
};

export const getCallByChannel = async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const { data: call, error: callError } = await tryCatch(callService.getCallByChannelId(channelId));

  if (callError) {
    logger.error('Error while fetching call by channel', { error: callError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to fetch call');
  }

  if (!call) {
    return failure(res, StatusCodes.NOT_FOUND, 'Call not found');
  }

  return success(res, StatusCodes.OK, 'Call fetched successfully', call);
};

export const userCancelService = async (req: Request, res: Response) => {
  const userId = req.userid;
  const { callId } = req.body as CancelCallRequest;

  const { data: call, error: callError } = await tryCatch(callService.userCancelCall(callId, userId));

  if (callError) {
    logger.error('Error while cancelling call', { error: callError, callId, userId });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, callError.message || 'Failed to cancel call');
  }

  if (!call) {
    return failure(res, StatusCodes.NOT_FOUND, 'Call not found');
  }

  // Call was ended (charges apply)
  logsService.createLog(`call ended by user ${userId} of type ${call.type}`, Event_Types.CALL_ENDED, userId, null, call.professionalId);

  // Notify both parties via WebSocket
  await websocketService.notifyCallEnded({
    channelId: call.agoraChannelId,
    callId: call.id,
    userId: call.userId,
    professionalId: call.professionalId,
    reason: 'call_ended_by_user',
    totalDuration: call.callDuration || 0,
  });

  return success(res, StatusCodes.OK, 'Call ended successfully', { call, action: 'ended' });
};
export const initiateVideoCall = async (req: Request, res: Response) => {
  const { professionalId } = req.body as InitiateServiceRequest;
  const userId = req.userid;
  const { data: getProf, error: getProfError } = await tryCatch(profService.getProfInfo(professionalId));
  if (getProfError || !getProf || getProf.isVerified === false) {
    logger.error('Error while getting professional', { error: getProfError });
    return failure(res, StatusCodes.NOT_FOUND, 'Professional not found');
  }
  //fetch user
  const { data: user, error: getUserError } = await tryCatch(userService.getUserById(userId));
  if (getUserError || !user) {
    logger.error('Error while getting user', { error: getUserError });
    return failure(res, StatusCodes.NOT_FOUND, 'User not found');
  }
  if (user.wallet?.totalBalence! < getProf.perMinuteRateCall) {
    return failure(res, StatusCodes.FORBIDDEN, 'Insufficient balance');
  }

  const { data: call, error: callError } = await tryCatch(
    callService.initiateService(userId, professionalId, getProf.perMinuteRateVideoCall, CallType.VIDEO_CALL, user.wallet?.totalBalence!)
  );
  if (callError || !call) {
    logger.error('Error while initiating video call', { error: callError });
    return failure(res, StatusCodes.SERVICE_UNAVAILABLE, 'Failed to initiate video call');
  }
  const token = signJwtForRoom(call.agoraChannelId, userId, 'USER', call.id, call.professionalId, CallType.VIDEO_CALL);
  return success(res, StatusCodes.OK, 'Video call initiated successfully', { call, ws: `${WSURL}/ws?token=${token}` });
};
