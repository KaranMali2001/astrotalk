import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.role !== 'ADMIN') {
    return res.status(StatusCodes.UNAUTHORIZED).json({ error: 'Unauthorized' });
  }
  next();
}
