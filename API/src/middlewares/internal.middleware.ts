import { JWT_INTERNAL_SECRET } from '@/config/jwt';
import logger from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';

export const internalMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    logger.error('No token found in request');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (token !== JWT_INTERNAL_SECRET) {
    logger.error('Invalid token');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};
