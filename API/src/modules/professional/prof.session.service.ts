import { prisma } from '@/app';
import { signJWT } from '@/utils/auth';

export const professionalSessionService = {
  startSession: async (professionalId: string) => {
    const sessionToken = signJWT(professionalId, 'PROFESSIONAL');
    return await prisma.$transaction(async tx => {
      const existingSession = await tx.professionalSession.findFirst({
        where: {
          professionalId,
          isActive: true,
          endTime: null,
        },
      });

      if (existingSession) {
        throw new Error('Professional already has an active session');
      }

      const professional = await tx.professional.update({
        where: { id: professionalId, isVerified: true },
        data: { isActive: true },
      });

      if (!professional) {
        throw new Error('Professional not found or not verified');
      }

      const session = await tx.professionalSession.create({
        data: {
          professionalId,
          startTime: new Date(),
          isActive: true,
          sessionToken: sessionToken,
        },
      });

      return session;
    });
  },

  endSession: async (professionalId: string) => {
    return await prisma.$transaction(async tx => {
      const activeSession = await tx.professionalSession.findFirst({
        where: {
          professionalId,
          isActive: true,
          endTime: null,
        },
      });

      if (!activeSession) {
        throw new Error('No active session found for professional');
      }

      const endTime = new Date();
      const startTime = activeSession.startTime;
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const rewardAmount = durationMinutes * 100;

      const updatedSession = await tx.professionalSession.update({
        where: { id: activeSession.id },
        data: {
          endTime,
          durationMinutes,
          rewardAmount,
          isActive: false,
        },
      });

      await tx.professional.update({
        where: { id: professionalId },
        data: { isActive: false },
      });

      // if (rewardAmount > 0) {
      //   await walletService.updateTotalBalance(rewardAmount, TransactionType.SESSION_REWARD, professionalId);
      // }

      return updatedSession;
    });
  },

  toggleSession: async (professionalId: string) => {
    const activeSession = await prisma.professionalSession.findFirst({
      where: {
        professionalId,
        isActive: true,
        endTime: null,
      },
    });

    if (activeSession) {
      return await professionalSessionService.endSession(professionalId);
    } else {
      return await professionalSessionService.startSession(professionalId);
    }
  },

  getActiveSession: async (professionalId: string) => {
    return await prisma.professionalSession.findFirst({
      where: {
        professionalId,
        isActive: true,
        endTime: null,
      },
    });
  },

  getSessionHistory: async (professionalId: string, limit = 10, offset = 0) => {
    return await prisma.professionalSession.findMany({
      where: { professionalId },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset,
    });
  },

  getSessionStats: async (professionalId: string) => {
    const stats = await prisma.professionalSession.aggregate({
      where: {
        professionalId,
        endTime: { not: null },
      },
      _sum: {
        durationMinutes: true,
        rewardAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalSessions: stats._count.id || 0,
      totalMinutes: stats._sum.durationMinutes || 0,
      totalRewards: stats._sum.rewardAmount || 0,
    };
  },
};
