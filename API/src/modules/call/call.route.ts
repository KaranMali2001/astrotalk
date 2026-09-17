import { authMiddleware } from '@/middlewares/auth.middleware';
import { profMiddleware } from '@/middlewares/prof.middleware';
import { userMiddleware } from '@/middlewares/user.middleware';
import { Router } from 'express';
import {
  browseProfessionals,
  endService,
  getCallByChannel,
  getProfessionalCallHistory,
  getUserCallHistory,
  initiateCall,
  initiateChat,
  initiateVideoCall,
  rejectService,
  startService,
  userCancelService,
} from './call.controller';

import { internalMiddleware } from '@/middlewares/internal.middleware';
import { zodMiddleware } from '@/middlewares/zod.middleware';
import { cancelCallSchema, endServiceSchema, initiateServiceSchema, RejectServiceRequest, startServiceSchema } from './zod';
export const callRouter = Router();
callRouter.get('/browse', browseProfessionals);

callRouter.post('/initiate-chat', authMiddleware, userMiddleware, zodMiddleware(initiateServiceSchema), initiateChat);
callRouter.post('/start-chat', internalMiddleware, zodMiddleware(startServiceSchema), startService);
callRouter.post('/end-chat', internalMiddleware, zodMiddleware(endServiceSchema), endService);
callRouter.post('/reject-chat', internalMiddleware, zodMiddleware(RejectServiceRequest), rejectService);

callRouter.post('/initiate-call', authMiddleware, userMiddleware, zodMiddleware(initiateServiceSchema), initiateCall);
callRouter.post('/start-call', internalMiddleware, zodMiddleware(startServiceSchema), startService);
callRouter.post('/end-call', internalMiddleware, endService);
callRouter.post('/reject-call', internalMiddleware, zodMiddleware(RejectServiceRequest), rejectService);

callRouter.post('/initiate-video-call', authMiddleware, userMiddleware, zodMiddleware(initiateServiceSchema), initiateVideoCall);
callRouter.post('/start-video-call', internalMiddleware, zodMiddleware(startServiceSchema), startService);
callRouter.post('/end-video-call', internalMiddleware, endService);
callRouter.post('/reject-video-call', internalMiddleware, zodMiddleware(RejectServiceRequest), rejectService);

callRouter.get('/user/history', authMiddleware, userMiddleware, getUserCallHistory);
callRouter.post('/user/cancel-call', authMiddleware, userMiddleware, zodMiddleware(cancelCallSchema), userCancelService);
callRouter.get('/professional/history', authMiddleware, profMiddleware, getProfessionalCallHistory);
callRouter.get('/by-channel/:channelId', internalMiddleware, getCallByChannel);
