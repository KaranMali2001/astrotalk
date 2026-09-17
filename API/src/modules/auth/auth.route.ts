import { zodMiddleware } from '@/middlewares/zod.middleware';
import { Router } from 'express';
import { checkUser } from './auth.controller';
import { checkUserSchema } from './zod';

export const authRouter = Router();

authRouter.post('/check', zodMiddleware(checkUserSchema), checkUser);
