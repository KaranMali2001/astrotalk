import { env } from '@/config/env';
import logger from '@/utils/logger';
import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Custom error class for application errors
 */
export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Prisma errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): { statusCode: number; message: string } {
  switch (error.code) {
    case 'P2002':
      return {
        statusCode: StatusCodes.CONFLICT,
        message: 'A record with this value already exists',
      };
    case 'P2025':
      return {
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Record not found',
      };
    case 'P2003':
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Invalid reference to related record',
      };
    case 'P2014':
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Invalid ID provided',
      };
    case 'P2000':
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        message: 'Input value is too long',
      };
    case 'P2001':
      return {
        statusCode: StatusCodes.NOT_FOUND,
        message: 'Record does not exist',
      };
    default:
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Database operation failed',
      };
  }
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError): { statusCode: number; message: string; errors: any } {
  //@ts-ignore
  const errors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return {
    statusCode: StatusCodes.BAD_REQUEST,
    message: 'Validation error',
    errors,
  };
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError | Prisma.PrismaClientKnownRequestError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { statusCode, message } = handlePrismaError(err);
    return res.status(statusCode).json({
      success: false,
      message,
      ...(env.ENV === 'development' && { error: err.message, code: err.code }),
    });
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation error',
      ...(env.ENV === 'development' && { error: err.message }),
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const { statusCode, message, errors } = handleZodError(err);
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  // Handle custom application errors
  if ('statusCode' in err && err.isOperational) {
    return res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: err.message,
      ...(env.ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle HTTP status code errors (from http-status-codes or similar)
  if ('statusCode' in err && typeof err.statusCode === 'number') {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || 'An error occurred',
      ...(env.ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle CORS errors
  if (err.message.includes('CORS')) {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: 'CORS policy violation',
    });
  }

  // Default error handler
  const statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  const message = env.ENV === 'production' ? 'Internal server error' : err.message;

  return res.status(statusCode).json({
    success: false,
    message,
    ...(env.ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  });
};

/**
 * Async error wrapper - wraps async route handlers to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler - must be placed after all routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Route ${req.originalUrl} not found`, StatusCodes.NOT_FOUND);
  next(error);
};




