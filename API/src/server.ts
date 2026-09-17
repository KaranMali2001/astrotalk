// server.ts
import 'dotenv/config';
import { app, prisma } from './app';
import { env } from './config/env';
import logger from './utils/logger';
import { Admin, Wallet } from '@prisma/client';
import { Server } from 'http';
import { MONEY } from './config/money';

const PORT = env.PORT;
export const TESTNUMBERS = ['1111111111', '2222222222', '3333333333'];

let server: Server;
export let admins: (Admin & { wallet: Wallet | null })[];
(async () => {
  try {
    logger.info('✅ JWT_SECRET and JWT_INTERNAL_SECRET are set');
    admins = await prisma.admin.findMany({
      include: {
        wallet: true,
      },
    });
    if (admins.length === 0) {
      await prisma.$transaction(async tx => {
        const admin = await tx.admin.create({
          data: {
            phoneNumber: '7507005599',
            name: 'ADMIN ',
            email: 'admin@gmail.com',
          },
        });
        const adminWallet = await tx.wallet.create({
          data: {
            id: env.PLATFORM_WALLET_ID,
            balance: MONEY.SCALE * 0,
            bonus: MONEY.SCALE * 0,
            currency: MONEY.DEFAULT_CURRENCY,
            adminId: admin.id,
          },
        });

        logger.info('Admin wallet created with balance', adminWallet.balance);
      });
      logger.error('No admins found');
    }
    logger.info('✅ Connected to the database ');

    server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Something is wrong', { error });
    // await cleanup();
    process.exit(1);
  }
})();

function backgroundCleanup() {
  logger.info('Starting background cleanup...');

  // Close HTTP server immediately (non-blocking)
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Disconnect Prisma in background (don't await)
  prisma
    .$disconnect()
    .then(() => {
      logger.info('Prisma disconnected successfully');
    })
    .catch(error => {
      logger.error('Error disconnecting Prisma:', error);
    });
}

// Handle all termination signals - NON-BLOCKING for auto-save compatibility
process.on('SIGINT', () => {
  logger.info('SIGINT received (Ctrl+C). Starting background cleanup...');
  backgroundCleanup();
  // Exit immediately without waiting
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting background cleanup...');
  backgroundCleanup();
  process.exit(0);
});

process.on('SIGQUIT', () => {
  logger.info('SIGQUIT received. Starting background cleanup...');
  backgroundCleanup();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  backgroundCleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  backgroundCleanup();
  process.exit(1);
});
