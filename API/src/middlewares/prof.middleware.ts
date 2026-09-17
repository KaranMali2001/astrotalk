import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export async function profMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.role !== 'PROFESSIONAL') {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' });
  }
  next();
}
