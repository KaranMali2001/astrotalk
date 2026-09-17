import { authMiddleware } from '@/middlewares/auth.middleware';
import { userMiddleware } from '@/middlewares/user.middleware';
import { zodMiddleware } from '@/middlewares/zod.middleware';
import { Router } from 'express';
import { createFeedback, getFeedbackByCallId, getFeedbackByProfessionalId } from './feedback.controller';
import { createFeedbackSchema } from './zod';

export const feedbackRouter = Router();

// Create feedback (user auth required)
feedbackRouter.post('/', authMiddleware, userMiddleware, zodMiddleware(createFeedbackSchema), createFeedback);

// Get feedback by call ID (public, but can be restricted if needed)
feedbackRouter.get('/call/:callId', getFeedbackByCallId);

// Get all feedbacks for a professional (public, paginated)
feedbackRouter.get('/professional/:professionalId', getFeedbackByProfessionalId);


