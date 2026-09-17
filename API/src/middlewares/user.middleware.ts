import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export async function userMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.role !== 'USER') {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' });
  }
  next();
}
