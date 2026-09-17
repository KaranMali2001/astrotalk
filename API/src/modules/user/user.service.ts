import { prisma } from '@/app';
import { env } from '@/config/env';
import { MONEY, toStoredAmount } from '@/config/money';
import { CallState, CallType } from '@prisma/client';

export const userService = {
  createUser: async (phoneNumber: string) => {
    return await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          username: phoneNumber,
          phoneNumber: phoneNumber,
          wallet: {
            create: { balance: toStoredAmount(100), bonus: toStoredAmount(50), currency: MONEY.DEFAULT_CURRENCY, totalBalence: toStoredAmount(150) },
          },
          lastLoginAt: new Date(),
        },
        include: {
          wallet: true,
        },
      });

      return user;
    });
  },
  createMinimalUser: async (phoneNumber: string) => {
    return await prisma.user.create({
      data: {
        username: phoneNumber,
        phoneNumber: phoneNumber,
        onboardingComplete: false,
        // No wallet created at this stage
      },
    });
  },
  cancelCallByUser: async (userId: string, callId: string, callType: CallType, reason: string | undefined) => {
    return await prisma.call.update({
      where: {
        id: callId,
        userId: userId,
        callState: CallState.CALL_INITIATED,
        type: callType,
      },
      data: {
        callState: CallState.CALL_CANCELLED,
        reasonToReject: reason,
        user: {
          update: {
            isInCall: false,
          },
        },
      },
    });
  },
  getUserById: async (id: string) => {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        sessions: {
          orderBy: {
            createdAt: 'desc', // newest first
          },
          take: 1, // only the latest session
        },
      },
    });
  },
  isExist: async (phoneNumber: string, requestId: string) => {
    return prisma.$transaction(async tx => {
      if (env.ENV === 'production') {
        await tx.tempOtp.delete({
          where: {
            requestId_phoneNumber: {
              requestId,
              phoneNumber,
            },
          },
        });
      }
      const user = await tx.user.findUnique({
        where: {
          phoneNumber: phoneNumber,
        },
      });

      return user;
    });
  },
  isOnboardingComplete: async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingComplete: true,
      },
    });

    if (!user) return false;

    return user.onboardingComplete ?? false;
  },

  getAllusers: async () => {
    return await prisma.user.findMany({
      select: {
        wallet: true,
      },
    });
  },
  getUserByNumber: async (phoneNumber: string) => {
    return await prisma.user.findUnique({
      where: {
        phoneNumber: phoneNumber,
      },
    });
  },
  updateUser: async (userId: string, lastLogin: Date) => {
    return await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: lastLogin,
      },
    });
  },
  completeOnboarding: async (
    userId: string,
    username: string | undefined,
    dateOfBirth: string,
    language: string[],
    gender: string,
    categoryIds: string[] | undefined,
    relationshipGoals: string[] | undefined
  ) => {
    return await prisma.$transaction(async (tx) => {
      // Check if wallet exists, create if missing (for minimal users created during OTP verification)
      const existingWallet = await tx.wallet.findUnique({
        where: { userId: userId },
      });

      if (!existingWallet) {
        // Create wallet with initial balance for new users completing onboarding
        await tx.wallet.create({
          data: {
            userId: userId,
            balance: toStoredAmount(100),
            bonus: toStoredAmount(50),
            currency: MONEY.DEFAULT_CURRENCY,
            totalBalence: toStoredAmount(150),
          },
        });
      }

      // Update user basic info
      const user = await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(username && { username }),
          dateOfBirth: new Date(dateOfBirth),
          language: language.length > 0 ? JSON.stringify(language) : null,
          gender,
          ...(relationshipGoals && { relationshipGoals }),
          onboardingComplete: true,
          lastLoginAt: new Date(),
        },
        include: {
          wallet: true,
        },
      });

      // Handle categories
      if (categoryIds && categoryIds.length > 0) {
        // Delete existing user categories
        await tx.userCategory.deleteMany({
          where: {
            userId: userId,
          },
        });

        // Create new user categories
        await tx.userCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            userId: userId,
            categoryId: categoryId,
          })),
        });
      }

      return user;
    });
  },
  convertToProfessional: async (userId: string, phoneNumber: string) => {
    // Convert a temporary user account to a professional account
    // This is used when a user decides to become a professional during onboarding
    return await prisma.$transaction(async (tx) => {
      // Check if professional already exists with this phone number
      const existingProf = await tx.professional.findUnique({
        where: { phoneNumber },
      });

      if (existingProf) {
        throw new Error('Professional account already exists with this phone number');
      }

      // Get the user to preserve any data
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create professional account
      const professional = await tx.professional.create({
        data: {
          phoneNumber: phoneNumber,
          name: user.username || phoneNumber,
          aboutMe: 'PROFESSIONAL',
          email: '',
          wallet: {
            create: {
              balance: toStoredAmount(0),
              bonus: 0,
              currency: MONEY.DEFAULT_CURRENCY,
              totalBalence: 0,
            },
          },
          lastLogin: new Date(),
          perMinuteRateChat: toStoredAmount(10),
          perMinuteRateCall: toStoredAmount(10),
          perMinuteRateVideoCall: toStoredAmount(10),
        },
        include: {
          wallet: true,
        },
      });

      // Delete the temporary user account (cascade will handle wallet if it exists)
      await tx.user.delete({
        where: { id: userId },
      });

      return professional;
    });
  },
};
