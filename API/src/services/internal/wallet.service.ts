import { prisma } from '@/app';
import { toDisplayAmount } from '@/config/money';
import { TransactionStatus, TransactionType } from '@prisma/client';

export const walletService = {
  updateTotalBalance: async (amount: number, type: TransactionType, professionalId?: string | null, userId?: string) => {
    if (!professionalId && !userId) {
      throw new Error('At least one ID must be provided');
    }

    return await prisma.$transaction(async tx => {
      const wallet = await tx.wallet.update({
        where: professionalId ? { professionalId } : { userId },
        data: {
          totalBalence: { increment: amount },
          balance: { increment: amount },
        },
      });
      await tx.transaction.create({
        data: {
          userId: userId ? userId : undefined,
          professionalId: professionalId ? professionalId : undefined,
          amount: amount,
          type: type,
          status: TransactionStatus.SUCCESS,
          description: `${type} - Amount: ₹${toDisplayAmount(amount)}`,
          walletId: wallet.id,
        },
      });
      return wallet;
    });
  },
};
