import { adminMiddleware } from '@/middlewares/admin.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { internalMiddleware } from '@/middlewares/internal.middleware';
import { zodMiddleware } from '@/middlewares/zod.middleware';
import { Router } from 'express';
import {
  cancelService,
  completeOnboarding,
  getAllUsers,
  getCurrentUser,
  getUserById,
  login,
  logout,
  registerAsProfessional,
  verifyOtp,
} from './user.controller';
import { cancelCallRequestSchema, loginRequestSchema, onboardingRequestSchema, verifyOtpRequestSchema } from './zod';

export const userRouter = Router();
userRouter.post('/otp-login', zodMiddleware(loginRequestSchema), login);
userRouter.post('/verify-otp', zodMiddleware(verifyOtpRequestSchema), verifyOtp);
userRouter.get('/:id', internalMiddleware, getUserById);
userRouter.use(authMiddleware);
userRouter.get('/', getCurrentUser);
userRouter.post('/complete-onboarding', zodMiddleware(onboardingRequestSchema), completeOnboarding);
userRouter.post('/register-as-professional', authMiddleware, registerAsProfessional);
userRouter.get('/all-users', adminMiddleware, getAllUsers);
userRouter.post('/cancel-service', zodMiddleware(cancelCallRequestSchema), cancelService);
userRouter.get('/logout', authMiddleware, logout);
