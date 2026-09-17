import { prisma } from '@/app';
import logger from '@/utils/logger';

export const feedbackService = {
  createFeedback: async (userId: string, callId: string, rating: number, comment?: string) => {
    return await prisma.$transaction(async tx => {
      // Validate call exists and belongs to user
      const call = await tx.call.findFirst({
        where: {
          id: callId,
          userId: userId,
        },
        include: {
          professional: true,
        },
      });

      if (!call) {
        throw new Error('Call not found or does not belong to user');
      }


      // Check if feedback already exists
      const existingFeedback = await tx.callFeedback.findUnique({
        where: { callId },
      });

      if (existingFeedback) {
        throw new Error('Feedback already exists for this call');
      }

      // Create feedback
      const feedback = await tx.callFeedback.create({
        data: {
          callId,
          userId,
          professionalId: call.professionalId,
          rating,
          comment: comment || null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Recalculate professional rating
      await feedbackService.recalculateProfessionalRating(call.professionalId, tx);

      return feedback;
    });
  },

  getFeedbackByCallId: async (callId: string) => {
    return await prisma.callFeedback.findUnique({
      where: { callId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  },

  getFeedbackByProfessionalId: async (professionalId: string, limit = 10, offset = 0) => {
    const [feedbacks, total] = await Promise.all([
      prisma.callFeedback.findMany({
        where: { professionalId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.callFeedback.count({
        where: { professionalId },
      }),
    ]);

    return {
      feedbacks,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  recalculateProfessionalRating: async (professionalId: string, tx?: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
    const prismaClient = (tx as any) || prisma;

    const feedbacks = await prismaClient.callFeedback.findMany({
      where: { professionalId },
      select: { rating: true },
    });

    if (feedbacks.length === 0) {
      // No feedbacks, set rating to null
      await prismaClient.professional.update({
        where: { id: professionalId },
        data: { rating: null },
      });
      return;
    }

    const totalRating = feedbacks.reduce((sum: number, f: { rating: number }) => sum + f.rating, 0);
    const averageRating = totalRating / feedbacks.length;
    const roundedRating = Math.round(averageRating * 100) / 100; // Round to 2 decimal places

    await prismaClient.professional.update({
      where: { id: professionalId },
      data: { rating: roundedRating },
    });

    logger.info('Professional rating recalculated', {
      professionalId,
      averageRating: roundedRating,
      totalFeedbacks: feedbacks.length,
    });
  },
};
