import { prisma } from '@/app';
import { env } from '@/config/env';
import { MONEY, toStoredAmount } from '@/config/money';
import { CallState } from '@prisma/client';

export const profService = {
  createProf: async (phoneNumber: string, name: string, about_me: string, email: string) => {
    return await prisma.$transaction(async tx => {
      const user = await tx.professional.create({
        data: {
          name: name,
          aboutMe: about_me,
          email: email,
          phoneNumber: phoneNumber,

          wallet: {
            create: { balance: toStoredAmount(0), bonus: 0, currency: MONEY.DEFAULT_CURRENCY, totalBalence: 0 },
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

      return user;
    });
  },
  isProfExist: async (phoneNumber: string, requestId: string) => {
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
      const user = await tx.professional.findUnique({
        where: {
          phoneNumber: phoneNumber,
        },
      });

      return user;
    });
  },
  updateProf: async (id: string, lastLogin: Date) => {
    return await prisma.professional.update({
      where: {
        id,
      },
      data: {
        lastLogin,
      },
    });
  },
  getPending: async (userId: string) => {
    return await prisma.call.findMany({
      where: {
        professionalId: userId,
        callState: CallState.CALL_INITIATED,
      },
      select: {
        id: true,
        maxCallDuration: true,
        agoraChannelId: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  },
  getProfInfo: async (id: string) => {
    return await prisma.professional.findUnique({
      where: {
        id,
      },
      include: {
        wallet: true,
        callsAsProfessional: true,
        professionalCategories: true,
      },
    });
  },
  getProfByNumber: async (phoneNumber: string) => {
    return await prisma.professional.findUnique({
      where: {
        phoneNumber,
      },
      include: {
        wallet: true,
      },
    });
  },
  completeOnboarding: async (
    professionalId: string,
    name: string | undefined,
    dateOfBirth: string,

    gender: string,

    voiceRecording: string | undefined,

    categoryIds: string[]
  ) => {
    return await prisma.$transaction(async tx => {
      const prof = await tx.professional.update({
        where: {
          id: professionalId,
        },
        data: {
          ...(name && { name }),
          dateOfBirth: new Date(dateOfBirth),
          voiceRecording: voiceRecording ?? undefined,
          onboardingComplete: true,
          gender,
        },
      });
      if (categoryIds.length > 0) {
        await tx.professionalCategory.createMany({
          data: categoryIds.map(id => ({
            professionalId,
            categoryId: id,
          })),
        });
      }
      return prof;
    });
  },
  isOnboardingComplete: async (professionalId: string) => {
    const prof = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: {
        onboardingComplete: true,
      },
    });

    if (!prof) return false;

    return prof.onboardingComplete ?? false;
  },
};
