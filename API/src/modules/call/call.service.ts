import { prisma } from '@/app';
import { toDisplayAmount } from '@/config/money';
import { commissionRate } from '@/constant';

import { agoraService } from '@/services/external/agora.service';
import logger from '@/utils/logger';
import { CallState, CallType, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { env } from '@/config/env';

// Constants to remove magic numbers
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export const callService = {
  // No transaction needed - read-only operation
  browseProfessionals: async (query?: string) => {
    const where: Prisma.ProfessionalWhereInput = {
      isActive: true,
      isVerified: true,
      isInCall: false,
      deletedAt: null,
    };

    // Add name search filter if query is provided
    if (query && query.trim().length > 0) {
      where.name = {
        contains: query.trim(),
        mode: 'insensitive',
      };
    }

    const professionals = await prisma.professional.findMany({
      select: {
        id: true,
        name: true,
        aboutMe: true,
        rating: true,
        perMinuteRateChat: true,
        perMinuteRateCall: true,
        totalCallDuration: true,
        totalChats: true,
        professionalSessions: {
          where: { isActive: true, endTime: null },
          orderBy: { startTime: 'desc' },
          take: 1,
          select: { id: true, startTime: true },
        },
      },
      where,
    });

    return professionals.map(p => ({
      ...p,
      perMinuteRateChat: toDisplayAmount(p.perMinuteRateChat),
      perMinuteRateCall: toDisplayAmount(p.perMinuteRateCall),
      professionalSessions: p.professionalSessions[0] ?? null,
    }));
  },

  // No transaction needed - single query
  getCall: async (
    callId: string,
    filters?: {
      isInCall?: boolean;
      callState?: CallState;
    }
  ) => {
    return await prisma.call.findFirst({
      where: {
        id: callId,
        user: filters?.isInCall !== undefined ? { isInCall: filters.isInCall } : undefined,
        callState: filters?.callState,
      },
    });
  },

  // No transaction needed - single query
  getCallByChannelId: async (channelId: string, filters?: { callState?: CallState }) => {
    return await prisma.call.findFirst({
      where: {
        agoraChannelId: channelId,
        callState: filters?.callState,
      },
    });
  },

  initiateService: async (userId: string, professionalId: string, professionalRate: number, type: CallType, totalBalance: number) => {
    // Validation before transaction
    if (totalBalance < professionalRate) {
      throw new Error('Insufficient balance to initiate call');
    }

    const maxCallDuration = Math.floor(totalBalance / professionalRate);

    if (maxCallDuration < 1) {
      throw new Error('Insufficient balance for minimum call duration');
    }

    return await prisma.$transaction(async tx => {
      // Check for existing INITIATED calls for this user
      const existingUserCall = await tx.call.findFirst({
        where: {
          userId: userId,
          callState: CallState.CALL_INITIATED,
        },
      });

      if (existingUserCall) {
        throw new Error('User already has an initiated call');
      }

      // Check if professional is available
      const professional = await tx.professional.findFirst({
        where: {
          id: professionalId,
          isActive: true,
          isVerified: true,
          isInCall: false,
          deletedAt: null,
        },
      });

      if (!professional) {
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            isInCall: false,
          },
        });
        throw new Error('Professional is not available');
      }

      const agoraRoomId = agoraService.generateChannelId(userId, professionalId, Date.now());

      const call = await tx.call.create({
        data: {
          userId: userId,
          professionalId: professionalId,
          rate: professionalRate,
          type: type,
          callState: CallState.CALL_INITIATED,
          maxCallDuration: maxCallDuration,
          agoraChannelId: agoraRoomId,
        },
      });

      // Check if user exists and is not already in a call before updating
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, isInCall: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.isInCall) {
        throw new Error('User is already in a call');
      }

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          isInCall: true,
        },
      });

      return call;
    });
  },

  startService: async (profId: string, userId: string) => {
    return await prisma.$transaction(async tx => {
      // Find the specific INITIATED call for this user-professional pair
      const call = await tx.call.findFirst({
        where: {
          userId: userId,
          professionalId: profId,
          callState: CallState.CALL_INITIATED,
          professional: {
            isInCall: false,
            isActive: true,
            isVerified: true,
            deletedAt: null,
          },
        },
      });

      if (!call) {
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            isInCall: false,
          },
        });
        throw new Error('No initiated call found for this user-professional pair');
      }

      const updatedCall = await tx.call.update({
        where: {
          id: call.id,
        },
        data: {
          callStart: new Date(),
          callState: CallState.CALL_START,
          professional: {
            update: {
              isInCall: true,
            },
          },
        },
        include: {
          user: true,
        },
      });

      return updatedCall;
    });
  },

  endService: async (channelNameOrCallId: string) => {
    const call = await prisma.$transaction(async tx => {
      const start = Date.now();
      // Try to find by agoraChannelId first (since API passes channelName)
      // If not found, try by id
      let currentCall = await prisma.call.findFirst({
        where: {
          agoraChannelId: channelNameOrCallId,
        },
        include: {
          user: { include: { wallet: true } },
          professional: { include: { wallet: true } },
        },
      });

      // If not found by channelId, try by id
      if (!currentCall) {
        currentCall = await prisma.call.findFirst({
          where: {
            id: channelNameOrCallId,
          },
          include: {
            user: { include: { wallet: true } },
            professional: { include: { wallet: true } },
          },
        });
      }

      // If no call found, return null (not error)
      if (!currentCall) {
        logger.info('No call found for this channel ID', { channelNameOrCallId });
        return null;
      }

      // If call already ended or has duration recorded → just return it
      if (currentCall.callState === CallState.CALL_END || currentCall.callDuration || currentCall.callEnd) {
        return currentCall;
      }

      if (!currentCall.callStart) {
        logger.info('Call not started properly', { callId: currentCall.id });
        return currentCall; // not started properly → return as is
      }

      // --- process normally ---
      const callEndTime = new Date();
      const totalDurationMs = callEndTime.getTime() - currentCall.callStart.getTime();
      const totalDurationSeconds = Math.ceil(totalDurationMs / MILLISECONDS_PER_SECOND);
      const totalDurationMinutes = Math.ceil(totalDurationMs / MILLISECONDS_PER_MINUTE);

      if (totalDurationSeconds < 0) {
        logger.info('Invalid duration', { callId: currentCall.id });
        return currentCall; // invalid duration → don't throw
      }

      const totalCharge = totalDurationMinutes * currentCall.rate;
      const commissionAmount = Math.ceil(totalCharge * commissionRate);
      const professionalAmount = totalCharge - commissionAmount;

      const call = await tx.call.update({
        where: {
          id: currentCall.id,
          callState: CallState.CALL_START,
        },
        data: {
          callEnd: callEndTime,
          callState: CallState.CALL_END,
          callDuration: totalDurationSeconds,
          totalCharge: totalCharge,
          professional: {
            update: {
              isInCall: false,
              totalCallDuration: {
                increment: currentCall.type === CallType.AUDIO_CALL ? totalDurationSeconds : 0,
              },
              totalChats: {
                increment: currentCall.type === CallType.CHAT ? 1 : 0,
              },
              wallet: {
                update: {
                  balance: { increment: professionalAmount },
                  totalBalence: { increment: professionalAmount },
                },
              },
            },
          },
        },

        include: {
          user: { include: { wallet: true } },
          professional: { include: { wallet: true } },
        },
      });

      // await tx.professional.update({
      //   where: { id: currentCall.professionalId },
      //   data: {
      //     isInCall: false,
      //     totalCallDuration: {
      //       increment: currentCall.type === CallType.AUDIO_CALL ? totalDurationSeconds : 0,
      //     },
      //     totalChats: {
      //       increment: currentCall.type === CallType.CHAT ? 1 : 0,
      //     },
      //   },
      // });

      let bonus: number = 0;

      if (call.user.wallet?.balance! < totalCharge) {
        bonus = totalCharge - call.user.wallet!.balance!;
      }
      // await tx.wallet.update({
      //   where: { professionalId: currentCall.professionalId },
      //   data: {
      //     balance: { increment: professionalAmount },
      //     totalBalence: { increment: professionalAmount },
      //   },
      // });

      await tx.user.update({
        where: { id: currentCall.userId },
        data: {
          isInCall: false,
          wallet: {
            update: {
              balance: {
                decrement: bonus > 0 ? totalCharge - bonus : totalCharge,
              },
              bonus: {
                decrement: bonus > 0 ? bonus : 0,
              },
              totalBalence: {
                decrement: totalCharge,
              },
            },
          },
        },
      });
      await tx.wallet.update({
        data: {
          balance: {
            increment: commissionAmount,
          },
        },
        where: {
          id: env.PLATFORM_WALLET_ID,
        },
      });
      // await tx.wallet.update({
      //   where: { userId: currentCall.userId },
      //   data: {
      //     balance: { decrement: totalCharge },
      //     totalBalence: { decrement: totalCharge },
      //   },
      // });

      await tx.transaction.createMany({
        data: [
          {
            userId: currentCall.userId,
            amount: totalCharge,
            type: TransactionType.CALL_CHARGE,
            status: TransactionStatus.SUCCESS,
            description: `Call charge - Duration: ${totalDurationMinutes}min, Rate: ₹${currentCall.rate / 100}/min, Total: ₹${totalCharge / 100}`,
            walletId: call.user?.wallet?.id!,
          },
          {
            professionalId: currentCall.professionalId,
            amount: professionalAmount,
            type: TransactionType.CALL_CHARGE,
            status: TransactionStatus.SUCCESS,
            description: `Call earnings (after ${commissionRate * 100}% commission) - Duration: ${totalDurationMinutes}min, Received: ₹${professionalAmount / 100}`,
            walletId: call.professional.wallet?.id!,
          },
          {
            amount: commissionAmount,
            type: TransactionType.COMMISSION,
            status: TransactionStatus.SUCCESS,
            description: `Platform commission (${commissionRate * 100}%) from call - Duration: ${totalDurationMinutes}min, Amount: ₹${commissionAmount / 100}`,
            walletId: env.PLATFORM_WALLET_ID,
          },
        ],
      });
      logger.info('all the txn are completed and took', Date.now() - start);
      return call;
    });

    if (call) {
      try {
        await agoraService.invalidateChannelParticipants(call.agoraChannelId, [call.userId, call.professionalId]);
      } catch (error) {
        logger.warn('Failed to invalidate Agora channel after endService', { callId: call.id, channelId: call.agoraChannelId, error });
      }
    }

    return call;
  },
  rejectService: async (callId: string, profId: string, reason: string | undefined) => {
    return await prisma.$transaction(async tx => {
      // Verify call exists and is in correct state
      const existingCall = await tx.call.findFirst({
        where: {
          id: callId,
          professionalId: profId,
          callState: CallState.CALL_INITIATED,
        },
      });

      if (!existingCall) {
        throw new Error('Call not found or not in initiated state');
      }

      const call = await tx.call.update({
        where: {
          id: callId,
          professionalId: profId,
        },
        data: {
          callState: CallState.CALL_REJECTED,
          reasonToReject: reason,
          professional: {
            update: {
              isInCall: false,
            },
          },
          user: {
            update: {
              isInCall: false,
            },
          },
        },
        include: {
          user: true,
        },
      });

      return call;
    });
  },

  userCancelCall: async (callId: string, userId: string) => {
    return await prisma.$transaction(async tx => {
      // Find call and verify it belongs to the user
      const call = await tx.call.findFirst({
        where: {
          id: callId,
          userId: userId,
          deletedAt: null,
        },
        include: {
          user: { include: { wallet: true } },
          professional: { include: { wallet: true } },
        },
      });

      if (!call) {
        throw new Error('Call not found or you do not have permission to cancel this call');
      }

      // If call is already ended/cancelled/rejected, return as-is
      if (
        call.callState === CallState.CALL_END ||
        call.callState === CallState.CALL_CANCELLED ||
        call.callState === CallState.CHAT_CANCELLED ||
        call.callState === CallState.CALL_REJECTED ||
        call.callState === CallState.CHAT_REJECTED
      ) {
        return call;
      }

      // Handle INITIATED state - cancel without charges
      if (call.callState === CallState.CALL_INITIATED || call.callState === CallState.CALL_START) {
        const cancelledState = call.type === CallType.CHAT ? CallState.CHAT_CANCELLED : CallState.CALL_CANCELLED;

        const updatedCall = await tx.call.update({
          where: {
            id: callId,
          },
          data: {
            callState: cancelledState,
            user: {
              update: {
                isInCall: false,
              },
            },
            professional: {
              update: {
                isInCall: false,
              },
            },
          },
          include: {
            user: { include: { wallet: true } },
            professional: { include: { wallet: true } },
          },
        });

        return updatedCall;
      }

      // Unknown state
      throw new Error(`Cannot cancel call in state: ${call.callState}`);
    });
  },

  getUserCallHistory: async (userId: string, limit: number = 50) => {
    const calls = await prisma.call.findMany({
      where: {
        userId: userId,
        deletedAt: null,
      },
      include: {
        professional: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            rating: true,
          },
        },
        feedback: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return calls.map(call => ({
      id: call.id,
      type: call.type,
      callState: call.callState,
      callDuration: call.callDuration,
      totalCharge: call.totalCharge,
      rate: call.rate,
      callStart: call.callStart,
      callEnd: call.callEnd,
      createdAt: call.createdAt,
      reasonToReject: call.reasonToReject,
      professional: call.professional,
      feedback: call.feedback,
      canCancel: call.callState === CallState.CALL_INITIATED || call.callState === CallState.CALL_START,
    }));
  },

  getProfessionalCallHistory: async (professionalId: string, limit: number = 50) => {
    const calls = await prisma.call.findMany({
      where: {
        professionalId: professionalId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            phoneNumber: true,
          },
        },
        feedback: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return calls.map(call => ({
      id: call.id,
      type: call.type,
      callState: call.callState,
      callDuration: call.callDuration,
      totalCharge: call.totalCharge,
      rate: call.rate,
      callStart: call.callStart,
      callEnd: call.callEnd,
      createdAt: call.createdAt,
      feedback: call.feedback,
      reasonToReject: call.reasonToReject,
      user: call.user,
    }));
  },
};
