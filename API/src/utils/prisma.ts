// lib/prisma.ts - Prisma 6.15 Query Monitoring with Extensions
import { PrismaClient, Prisma } from '@prisma/client';

// Singleton pattern to prevent multiple Prisma instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Basic Prisma Client with built-in logging
const basePrisma = globalForPrisma.prisma ?? new PrismaClient({});

// Create extended client with query monitoring
const prisma = basePrisma.$extends({
  name: 'queryLogger',
  query: {
    // Monitor ALL operations across ALL models
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const result = await query(args);
        const end = performance.now();
        const duration = end - start;

        console.log('=====================================');
        console.log(`🔍 MODEL: ${model}`);
        console.log(`🎯 OPERATION: ${operation}`);
        console.log(`⏱️  DURATION: ${duration.toFixed(2)}ms`);
        console.log(`🕐 TIMESTAMP: ${new Date().toISOString()}`);
        // console.log(`📊 ARGS:`, JSON.stringify(args, null, 2));

        // Flag slow operations
        if (duration > 150) {
          console.log(`🐌 SLOW OPERATION: ${model}.${operation} took ${duration.toFixed(2)}ms`);
        }

        console.log('=====================================');

        return result;
      },
    },
  },
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

export default prisma;
