import { Response } from 'express';

export const success = <T = any>(res: Response, statusCode: number, message: string, data?: T) => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const failure = (res: Response, statusCode: number, message: string) => {
  return res.status(statusCode).json({ success: false, message });
};
