import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { adminService } from './admin.service';
import { success, failure } from '@/utils/response';
import { tryCatch } from '@/utils/try.catch';
import logger from '@/utils/logger';
import {
  AdminLoginRequest,
  AdminVerifyOtpRequest,
  UpdateUserWalletRequest,
  UpdateProfessionalWalletRequest,
  VerifyProfessionalRequest,
  UpdateProfessionalStatusRequest,
  UpdateUserStatusRequest,
  UpdateProfessionalRatesRequest,
} from './zod';

// Authentication - Send OTP
export async function sendOtp(req: Request, res: Response) {
  const { phoneNumber } = req.body as AdminLoginRequest;
  
  const { data: result, error } = await tryCatch(adminService.sendOtp(phoneNumber));
  
  if (error) {
    logger.error('Error while sending admin OTP', { error, phoneNumber });
    return failure(res, StatusCodes.BAD_REQUEST, error.message);
  }
  
  return success(res, StatusCodes.OK, result.message, { requestId: result.requestId });
}

// Authentication - Verify OTP & Login
export async function verifyOtp(req: Request, res: Response) {
  const { phoneNumber, otp, requestId } = req.body as AdminVerifyOtpRequest;
  
  const { data: result, error } = await tryCatch(adminService.verifyOtp(phoneNumber, otp, requestId));
  
  if (error) {
    logger.error('Error while verifying admin OTP', { error, phoneNumber });
    return failure(res, StatusCodes.UNAUTHORIZED, error.message);
  }
  
  return success(res, StatusCodes.OK, 'Admin login successful', result);
}

// Dashboard Stats
export async function getDashboardStats(req: Request, res: Response) {
  const { data: stats, error } = await tryCatch(adminService.getDashboardStats());
  
  if (error) {
    logger.error('Error while getting dashboard stats', { error });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to get dashboard stats');
  }
  
  return success(res, StatusCodes.OK, 'Dashboard stats retrieved successfully', stats);
}

// User Management - Get All Users
export async function getAllUsers(req: Request, res: Response) {
  const { search, isActive: isActiveStr, page = '1', limit = '10' } = req.query as any;
  
  const isActive = isActiveStr ? isActiveStr === 'true' : undefined;
  
  const { data: result, error } = await tryCatch(adminService.getAllUsers({
    search,
    isActive,
    page: Number(page),
    limit: Number(limit),
  }));
  
  if (error) {
    logger.error('Error while getting users', { error });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to get users');
  }
  
  return success(res, StatusCodes.OK, 'Users retrieved successfully', result);
}

// User Management - Update User Status
export async function updateUserStatus(req: Request, res: Response) {
  const { userId, isActive, reason } = req.body as UpdateUserStatusRequest;
  
  const { data: result, error } = await tryCatch(adminService.updateUserStatus(userId, isActive, reason));
  
  if (error) {
    logger.error('Error while updating user status', { error, userId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }
  
  return success(res, StatusCodes.OK, `User ${isActive ? 'activated' : 'deactivated'} successfully`, result);
}

// User Management - Update User Wallet
export async function updateUserWallet(req: Request, res: Response) {
  const { userId, amount, type, reason } = req.body as UpdateUserWalletRequest;
  
  const { data: result, error } = await tryCatch(adminService.updateUserWallet(userId, amount, type, reason));
  
  if (error) {
    logger.error('Error while updating user wallet', { error, userId });
    return failure(res, StatusCodes.BAD_REQUEST, error.message);
  }
  
  return success(res, StatusCodes.OK, `User wallet ${type.toLowerCase()}ed successfully`, result);
}

// Professional Management - Get All Professionals
export async function getAllProfessionals(req: Request, res: Response) {
  const { search, isActive: isActiveStr, isVerified: isVerifiedStr, page = '1', limit = '10' } = req.query as any;
  
  const isActive = isActiveStr ? isActiveStr === 'true' : undefined;
  const isVerified = isVerifiedStr ? isVerifiedStr === 'true' : undefined;
  
  const { data: result, error } = await tryCatch(adminService.getAllProfessionals({
    search,
    isActive,
    isVerified,
    page: Number(page),
    limit: Number(limit),
  }));
  
  if (error) {
    logger.error('Error while getting professionals', { error });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to get professionals');
  }
  
  return success(res, StatusCodes.OK, 'Professionals retrieved successfully', result);
}

// Professional Management - Verify Professional
export async function verifyProfessional(req: Request, res: Response) {
  const { professionalId, isVerified, verificationNotes } = req.body as VerifyProfessionalRequest;
  
  const { data: result, error } = await tryCatch(adminService.verifyProfessional(professionalId, isVerified, verificationNotes));
  
  if (error) {
    logger.error('Error while verifying professional', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }
  
  return success(res, StatusCodes.OK, `Professional ${isVerified ? 'verified' : 'unverified'} successfully`, result);
}

// Professional Management - Update Professional Status
export async function updateProfessionalStatus(req: Request, res: Response) {
  const { professionalId, isActive, reason } = req.body as UpdateProfessionalStatusRequest;
  
  const { data: result, error } = await tryCatch(adminService.updateProfessionalStatus(professionalId, isActive, reason));
  
  if (error) {
    logger.error('Error while updating professional status', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }
  
  return success(res, StatusCodes.OK, `Professional ${isActive ? 'activated' : 'deactivated'} successfully`, result);
}

// Professional Management - Update Professional Wallet
export async function updateProfessionalWallet(req: Request, res: Response) {
  const { professionalId, amount, type, reason } = req.body as UpdateProfessionalWalletRequest;
  
  const { data: result, error } = await tryCatch(adminService.updateProfessionalWallet(professionalId, amount, type, reason));
  
  if (error) {
    logger.error('Error while updating professional wallet', { error, professionalId });
    return failure(res, StatusCodes.BAD_REQUEST, error.message);
  }
  
  return success(res, StatusCodes.OK, `Professional wallet ${type.toLowerCase()}ed successfully`, result);
}

// Professional Management - Update Professional Rates
export async function updateProfessionalRates(req: Request, res: Response) {
  const { professionalId, perMinuteRateCall, perMinuteRateChat } = req.body as UpdateProfessionalRatesRequest;
  
  const rates: any = {};
  if (perMinuteRateCall !== undefined) rates.perMinuteRateCall = perMinuteRateCall;
  if (perMinuteRateChat !== undefined) rates.perMinuteRateChat = perMinuteRateChat;
  
  const { data: result, error } = await tryCatch(adminService.updateProfessionalRates(professionalId, rates));
  
  if (error) {
    logger.error('Error while updating professional rates', { error, professionalId });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, error.message);
  }
  
  return success(res, StatusCodes.OK, 'Professional rates updated successfully', result);
}

// Reports & Analytics - Get Calls Report
export async function getCallsReport(req: Request, res: Response) {
  const { status, startDate, endDate, page = '1', limit = '10' } = req.query as any;
  
  const { data: result, error } = await tryCatch(adminService.getCallsReport({
    status,
    startDate,
    endDate,
    page: Number(page),
    limit: Number(limit),
  }));
  
  if (error) {
    logger.error('Error while getting calls report', { error });
    return failure(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to get calls report');
  }
  
  return success(res, StatusCodes.OK, 'Calls report retrieved successfully', result);
}

// User-specific routes
export async function getUserById(req: Request, res: Response) {
  const { userId } = req.params;
  
  // TODO: Implement specific user details retrieval
  return success(res, StatusCodes.OK, 'User details retrieved successfully', { userId });
}

export async function getUserTransactions(req: Request, res: Response) {
  const { userId } = req.params;
  
  // TODO: Implement user transaction history
  return success(res, StatusCodes.OK, 'User transactions retrieved successfully', { userId });
}

export async function getUserCallHistory(req: Request, res: Response) {
  const { userId } = req.params;
  
  // TODO: Implement user call history
  return success(res, StatusCodes.OK, 'User call history retrieved successfully', { userId });
}

// Professional-specific routes
export async function getProfessionalById(req: Request, res: Response) {
  const { professionalId } = req.params;
  
  // TODO: Implement specific professional details retrieval
  return success(res, StatusCodes.OK, 'Professional details retrieved successfully', { professionalId });
}

export async function getProfessionalTransactions(req: Request, res: Response) {
  const { professionalId } = req.params;
  
  // TODO: Implement professional transaction history
  return success(res, StatusCodes.OK, 'Professional transactions retrieved successfully', { professionalId });
}

export async function getProfessionalCallHistory(req: Request, res: Response) {
  const { professionalId } = req.params;
  
  // TODO: Implement professional call history
  return success(res, StatusCodes.OK, 'Professional call history retrieved successfully', { professionalId });
}

export async function getProfessionalEarnings(req: Request, res: Response) {
  const { professionalId } = req.params;
  
  // TODO: Implement professional earnings report
  return success(res, StatusCodes.OK, 'Professional earnings retrieved successfully', { professionalId });
}