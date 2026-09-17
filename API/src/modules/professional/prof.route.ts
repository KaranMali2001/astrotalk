import { authMiddleware } from '@/middlewares/auth.middleware';
import { profMiddleware } from '@/middlewares/prof.middleware';
import { zodMiddleware } from '@/middlewares/zod.middleware';
import { Router } from 'express';
import {
  completeOnboarding,
  getSessionHistory,
  getSessionStatus,
  profInfo,
  profLogin,
  profPending,
  profRegister,
  profverifyOtp,
  toggleSession,
  closeSession,
  endCall,
} from './prof.controller';
import { loginRequestSchema, onboardingRequestSchema, registerProfSchema, verifyOtpRequestSchema } from './zod';
import { internalMiddleware } from '@/middlewares/internal.middleware';
export const profRouter = Router();
profRouter.post('/login', zodMiddleware(loginRequestSchema), profLogin); //dont let it login untill verified
profRouter.post('/register', zodMiddleware(registerProfSchema), profRegister);
profRouter.post('/verify-otp', zodMiddleware(verifyOtpRequestSchema), profverifyOtp);
// profRouter.put('/:id', zodMiddleware(updateProfSchema));
profRouter.get('/', authMiddleware, profMiddleware, profInfo); //send complete info
profRouter.post('/complete-onboarding', authMiddleware, profMiddleware, zodMiddleware(onboardingRequestSchema), completeOnboarding);
profRouter.get('/pending', authMiddleware, profMiddleware, profPending); //send complete info

// Session management routes
profRouter.post('/session/close/:id', internalMiddleware, closeSession);
profRouter.post('/session/toggle', authMiddleware, profMiddleware, toggleSession);
profRouter.get('/session/status', authMiddleware, profMiddleware, getSessionStatus);
profRouter.get('/session/history', authMiddleware, profMiddleware, getSessionHistory);
profRouter.post('/end-call', authMiddleware, profMiddleware, endCall);
