import { verifyJWT } from '@/utils/auth';
import logger from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.warn('No authentication token found in request');
    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
    return;
  }

  const { userId, role, error } = verifyJWT(token);

  if (error) {
    logger.error('Authentication error', { error });
    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
    return;
  } else if (!userId) {
    logger.warn('No user session found for valid JWT');
    res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Invalid token' });
    return;
  }

  req.userid = userId;
  req.role = role;
  next();
}
