import logger from '@/utils/logger';
import { failure, success } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { feedbackService } from './feedback.service';
import { CreateFeedbackRequest } from './zod';

export const createFeedback = async (req: Request, res: Response) => {
  const userId = req.userid;
  const { callId, rating, comment } = req.body as CreateFeedbackRequest;

  const { data: feedback, error } = await tryCatch(feedbackService.createFeedback(userId, callId, rating, comment));

  if (error) {
    logger.error('Error while creating feedback', { error, userId, callId });
    return failure(res, StatusCodes.BAD_REQUEST, error.message || 'Failed to create feedback');
  }

  return success(res, StatusCodes.CREATED, 'Feedback submitted successfully', feedback);
};

export const getFeedbackByCallId = async (req: Request, res: Response) => {
  const { callId } = req.params;

  const { data: feedback, error } = await tryCatch(feedbackService.getFeedbackByCallId(callId));

  if (error) {
    logger.error('Error while fetching feedback', { error, callId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch feedback');
  }

  if (!feedback) {
    return success(res, StatusCodes.OK, 'No feedback found for this call', null);
  }

  return success(res, StatusCodes.OK, 'Feedback fetched successfully', feedback);
};

export const getFeedbackByProfessionalId = async (req: Request, res: Response) => {
  const { professionalId } = req.params;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = parseInt(req.query.offset as string) || 0;

  const { data: result, error } = await tryCatch(
    feedbackService.getFeedbackByProfessionalId(professionalId, limit, offset)
  );

  if (error) {
    logger.error('Error while fetching feedbacks', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch feedbacks');
  }

  return success(res, StatusCodes.OK, 'Feedbacks fetched successfully', result);
};


