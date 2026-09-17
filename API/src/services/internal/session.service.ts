import { prisma } from '@/app';
import { UserRole } from '@prisma/client';

export const sessionService = {
  createSession: async ({
    sessionToken,
    expiresAt,
    userRole,
    adminId,
    professionalId,
    userId,
  }: {
    sessionToken: string;
    expiresAt: Date;
    userRole: UserRole;
    adminId?: string;
    professionalId?: string;
    userId?: string;
  }) => {
    return await prisma.userSession.create({
      data: {
        userId: userId ?? null,
        adminId: adminId ?? null,
        professionalId: professionalId ?? null,
        sessionToken,
        expiresAt,
        deviceId: '127.0.0.1',
        deviceType: 'DESKTOP',
        deviceModel: 'Unknown',
        osName: 'Unknown',
        osVersion: 'Unknown',
        appVersion: 'unknown',
        loginAt: new Date(),
        isActive: true,
        userRole,
      },
    });
  },

  deleteSession: async (userId?: string, adminId?: string, professionalId?: string) => {
    const whereCondition: any = {};
    if (userId) whereCondition.userId = userId;
    else if (professionalId) whereCondition.professionalId = professionalId;
    else if (adminId) whereCondition.adminId = adminId;
    else throw new Error('At least one ID must be provided');

    return await prisma.userSession.updateMany({
      where: whereCondition,
      data: {
        isActive: false,
        logoutAt: new Date(),
        // sessionDuration calculated automatically by trigger
      },
    });
  },
};
