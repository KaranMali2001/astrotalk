import { prisma } from '@/app';
import { Event_Types } from '@/constant';

export const logsService = {
  createLog: async (message: string, eventType: Event_Types, userId?: string, adminId?: string | null, professionalId?: string) => {
    return await prisma.log.create({
      data: {
        eventType,
        ...(userId && { userId }),
        ...(adminId && { adminId }),
        ...(professionalId && { professionalId }),
        metadata: JSON.stringify({ message }),
      },
    });
  },
};
