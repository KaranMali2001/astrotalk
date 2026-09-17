import { prisma } from '@/app';
import { toDisplayAmount } from '@/config/money';
import { TransactionType, TransactionStatus, CallState } from '@prisma/client';
import { logsService } from '@/services/internal/logs.service';
import { sessionService } from '@/services/internal/session.service';
import { smsService } from '@/services/external/sms.service';
import { Event_Types } from '@/constant';
import { signJWT, saveTempOtp } from '@/utils/auth';
import { env } from '@/config/env';
import { TESTNUMBERS } from '@/server';

export const adminService = {
  // Authentication - Phone Number + OTP (similar to user login)
  sendOtp: async (phoneNumber: string) => {
    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { phoneNumber },
    });

    if (!admin) {
      throw new Error('Admin not found with this phone number');
    }

    if (!admin.isActive) {
      throw new Error('Admin account is deactivated');
    }

    // Use test numbers for development
    if (TESTNUMBERS.includes(phoneNumber)) {
      return { success: true, message: 'OTP sent successfully', requestId: 'test-request-id' };
    }

    if (env.ENV === 'development') {
      return { success: true, message: 'OTP sent successfully', requestId: 'test-request-id' };
    }

    // Send OTP via SMS service
    const otpResponse = await smsService.sendOtp(phoneNumber);

    if (!otpResponse || otpResponse.status !== 200) {
      throw new Error('Failed to send OTP');
    }

    // Save temp OTP
    await saveTempOtp(phoneNumber, otpResponse.data.requestId);

    return {
      success: true,
      message: 'OTP sent successfully',
      requestId: otpResponse.data.requestId,
    };
  },

  verifyOtp: async (phoneNumber: string, otp: string, requestId: string) => {
    let verifyOtpResponse: any;

    if (env.ENV === 'development') {
      // Use dev OTP
      const devOtp = env.INTERNAL_OTP;

      if (otp !== devOtp) {
        throw new Error('Invalid OTP');
      }
      verifyOtpResponse = { status: 200, data: { isOTPVerified: true } };
    } else {
      // Production OTP verification
      verifyOtpResponse = await smsService.verifyOtp(otp, requestId);

      if (!verifyOtpResponse || verifyOtpResponse.status !== 200 || !verifyOtpResponse.data.isOTPVerified) {
        throw new Error('Invalid OTP');
      }
    }

    // Delete temp OTP after verification
    if (env.ENV === 'production') {
      await prisma.tempOtp.delete({
        where: {
          requestId_phoneNumber: {
            requestId,
            phoneNumber,
          },
        },
      });
    }

    // Get admin details
    const admin = await prisma.admin.findUnique({
      where: { phoneNumber },
      include: { wallet: true },
    });

    if (!admin) {
      throw new Error('Admin not found');
    }

    if (!admin.isActive) {
      throw new Error('Admin account is deactivated');
    }

    // Create JWT token
    const token = signJWT(admin.id, 'ADMIN');

    // Create session
    await sessionService.createSession({
      sessionToken: token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      userRole: 'ADMIN',
      adminId: admin.id,
    });

    // Log admin login
    await logsService.createLog(`Admin login successful for ${phoneNumber}`, Event_Types.ADMIN_LOGIN, undefined, admin.id);

    return {
      admin: {
        ...admin,
        wallet: admin.wallet
          ? {
              ...admin.wallet,
              balance: toDisplayAmount(admin.wallet.balance),
              totalBalence: toDisplayAmount(admin.wallet.totalBalence),
            }
          : null,
      },
      token,
    };
  },

  // User Management
  getAllUsers: async (filters: { search?: string; isActive?: boolean; page: number; limit: number }) => {
    const { search, isActive, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          wallet: true,
          _count: {
            select: {
              callsAsUser: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map(user => ({
        ...user,
        wallet: user.wallet
          ? {
              ...user.wallet,
              balance: toDisplayAmount(user.wallet.balance),
              totalBalence: toDisplayAmount(user.wallet.totalBalence),
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  updateUserStatus: async (userId: string, isActive: boolean, reason: string) => {
    return await prisma.$transaction(async tx => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          isActive,
          // If deactivating, ensure user is not in call
          ...(isActive === false && { isInCall: false }),
        },
        include: { wallet: true },
      });

      // Log the status change using existing logs service
      await logsService.createLog(
        `User ${isActive ? 'activated' : 'deactivated'}: ${reason}`,
        Event_Types.ADMIN_USER_STATUS_CHANGED,
        userId,
        null // adminId - TODO: pass actual admin ID
      );

      return {
        ...user,
        wallet: user.wallet
          ? {
              ...user.wallet,
              balance: toDisplayAmount(user.wallet.balance),
              totalBalence: toDisplayAmount(user.wallet.totalBalence),
            }
          : null,
      };
    });
  },

  updateUserWallet: async (userId: string, amount: number, type: 'ADD' | 'DEDUCT', reason: string) => {
    return await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.wallet) {
        throw new Error('User wallet not found');
      }

      if (type === 'DEDUCT' && user.wallet.balance < amount) {
        throw new Error('Insufficient balance for deduction');
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: type === 'ADD' ? { increment: amount } : { decrement: amount },
          totalBalence: type === 'ADD' ? { increment: amount } : { decrement: amount },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          amount,
          type: type === 'ADD' ? TransactionType.ADMIN_ADJUSTMENT : TransactionType.ADMIN_ADJUSTMENT,
          status: TransactionStatus.SUCCESS,
          description: `Admin ${type.toLowerCase()}: ${reason}`,
          walletId: updatedWallet.id,
        },
      });

      // Log admin action
      await logsService.createLog(
        `Admin ${type.toLowerCase()} wallet: ₹${amount / 100} - ${reason}`,
        Event_Types.ADMIN_WALLET_UPDATED,
        userId,
        null // adminId - TODO: pass actual admin ID
      );

      return {
        ...updatedWallet,
        balance: toDisplayAmount(updatedWallet.balance),
        totalBalence: toDisplayAmount(updatedWallet.totalBalence),
      };
    });
  },

  // Professional Management
  getAllProfessionals: async (filters: { search?: string; isActive?: boolean; isVerified?: boolean; page: number; limit: number }) => {
    const { search, isActive, isVerified, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    const [professionals, total] = await Promise.all([
      prisma.professional.findMany({
        where,
        include: {
          wallet: true,
          _count: {
            select: {
              callsAsProfessional: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.professional.count({ where }),
    ]);

    return {
      professionals: professionals.map(prof => ({
        ...prof,
        perMinuteRateCall: toDisplayAmount(prof.perMinuteRateCall),
        perMinuteRateChat: toDisplayAmount(prof.perMinuteRateChat),
        wallet: prof.wallet
          ? {
              ...prof.wallet,
              balance: toDisplayAmount(prof.wallet.balance),
              totalBalence: toDisplayAmount(prof.wallet.totalBalence),
            }
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  verifyProfessional: async (professionalId: string, isVerified: boolean, verificationNotes?: string) => {
    return await prisma.$transaction(async tx => {
      const professional = await tx.professional.update({
        where: { id: professionalId },
        data: {
          isVerified,
        },
        include: { wallet: true },
      });

      // Log verification action
      await logsService.createLog(
        `Professional ${isVerified ? 'verified' : 'unverified'}: ${verificationNotes || 'No notes provided'}`,
        Event_Types.ADMIN_PROFESSIONAL_VERIFIED,
        undefined,
        null, // adminId - TODO: pass actual admin ID
        professionalId
      );

      return {
        ...professional,
        perMinuteRateCall: toDisplayAmount(professional.perMinuteRateCall),
        perMinuteRateChat: toDisplayAmount(professional.perMinuteRateChat),
        wallet: professional.wallet
          ? {
              ...professional.wallet,
              balance: toDisplayAmount(professional.wallet.balance),
              totalBalence: toDisplayAmount(professional.wallet.totalBalence),
            }
          : null,
      };
    });
  },

  updateProfessionalStatus: async (professionalId: string, isActive: boolean, reason: string) => {
    return await prisma.$transaction(async tx => {
      const professional = await tx.professional.update({
        where: { id: professionalId },
        data: {
          isActive,
          // If deactivating, ensure professional is not in call
          ...(isActive === false && { isInCall: false }),
        },
        include: { wallet: true },
      });

      // Log status change
      await logsService.createLog(
        `Professional ${isActive ? 'activated' : 'deactivated'}: ${reason}`,
        Event_Types.ADMIN_PROFESSIONAL_STATUS_CHANGED,
        undefined,
        null, // adminId - TODO: pass actual admin ID
        professionalId
      );

      return {
        ...professional,
        perMinuteRateCall: toDisplayAmount(professional.perMinuteRateCall),
        perMinuteRateChat: toDisplayAmount(professional.perMinuteRateChat),
        wallet: professional.wallet
          ? {
              ...professional.wallet,
              balance: toDisplayAmount(professional.wallet.balance),
              totalBalence: toDisplayAmount(professional.wallet.totalBalence),
            }
          : null,
      };
    });
  },

  updateProfessionalWallet: async (professionalId: string, amount: number, type: 'ADD' | 'DEDUCT', reason: string) => {
    return await prisma.$transaction(async tx => {
      const professional = await tx.professional.findUnique({
        where: { id: professionalId },
        include: { wallet: true },
      });

      if (!professional) {
        throw new Error('Professional not found');
      }

      if (!professional.wallet) {
        throw new Error('Professional wallet not found');
      }

      if (type === 'DEDUCT' && professional.wallet.balance < amount) {
        throw new Error('Insufficient balance for deduction');
      }

      const updatedWallet = await tx.wallet.update({
        where: { professionalId },
        data: {
          balance: type === 'ADD' ? { increment: amount } : { decrement: amount },
          totalBalence: type === 'ADD' ? { increment: amount } : { decrement: amount },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          professionalId,
          amount,
          type: type === 'ADD' ? TransactionType.ADMIN_ADJUSTMENT : TransactionType.ADMIN_ADJUSTMENT,
          status: TransactionStatus.SUCCESS,
          description: `Admin ${type.toLowerCase()}: ${reason}`,
          walletId: updatedWallet.id,
        },
      });

      // Log admin action
      await logsService.createLog(
        `Admin ${type.toLowerCase()} professional wallet: ₹${amount / 100} - ${reason}`,
        Event_Types.ADMIN_WALLET_UPDATED,
        undefined,
        null, // adminId - TODO: pass actual admin ID
        professionalId
      );

      return {
        ...updatedWallet,
        balance: toDisplayAmount(updatedWallet.balance),
        totalBalence: toDisplayAmount(updatedWallet.totalBalence),
      };
    });
  },

  updateProfessionalRates: async (
    professionalId: string,
    rates: {
      perMinuteRateCall?: number;
      perMinuteRateChat?: number;
    }
  ) => {
    return await prisma.$transaction(async tx => {
      const professional = await tx.professional.update({
        where: { id: professionalId },
        data: rates,
        include: { wallet: true },
      });

      // Log rate change
      await logsService.createLog(
        `Updated rates: ${rates.perMinuteRateCall ? `Call: ₹${toDisplayAmount(rates.perMinuteRateCall)}/min ` : ''}${rates.perMinuteRateChat ? `Chat: ₹${toDisplayAmount(rates.perMinuteRateChat)}/min` : ''}`,
        Event_Types.ADMIN_RATES_UPDATED,
        undefined,
        null, // adminId - TODO: pass actual admin ID
        professionalId
      );

      return {
        ...professional,
        perMinuteRateCall: toDisplayAmount(professional.perMinuteRateCall),
        perMinuteRateChat: toDisplayAmount(professional.perMinuteRateChat),
        wallet: professional.wallet
          ? {
              ...professional.wallet,
              balance: toDisplayAmount(professional.wallet.balance),
              totalBalence: toDisplayAmount(professional.wallet.totalBalence),
            }
          : null,
      };
    });
  },

  // Analytics & Reports
  getDashboardStats: async () => {
    const [
      totalUsers,
      activeUsers,
      totalProfessionals,
      activeProfessionals,
      verifiedProfessionals,
      totalCalls,
      completedCalls,
      ongoingCalls,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.professional.count(),
      prisma.professional.count({ where: { isActive: true } }),
      prisma.professional.count({ where: { isVerified: true } }),
      prisma.call.count(),
      prisma.call.count({ where: { callState: CallState.CALL_END } }),
      prisma.call.count({ where: { callState: CallState.CALL_START } }),
      prisma.transaction.aggregate({
        where: { type: TransactionType.COMMISSION },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
      },
      professionals: {
        total: totalProfessionals,
        active: activeProfessionals,
        verified: verifiedProfessionals,
        unverified: totalProfessionals - verifiedProfessionals,
      },
      calls: {
        total: totalCalls,
        completed: completedCalls,
        ongoing: ongoingCalls,
      },
      revenue: {
        total: toDisplayAmount(totalRevenue._sum.amount || 0),
      },
    };
  },

  getCallsReport: async (filters: { status?: CallState; startDate?: string; endDate?: string; page: number; limit: number }) => {
    const { status, startDate, endDate, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.callState = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          professional: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.call.count({ where }),
    ]);

    return {
      calls: calls.map(call => ({
        ...call,
        rate: toDisplayAmount(call.rate),
        totalCharge: call.totalCharge ? toDisplayAmount(call.totalCharge) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
