import { prisma } from '@/app';

export const authService = {
  checkUser: async (phoneNumber: string) => {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    const professional = await prisma.professional.findUnique({
      where: { phoneNumber },
    });

    return { user, professional };
  },
};
