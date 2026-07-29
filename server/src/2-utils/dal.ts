import { PrismaClient } from '@prisma/client';

/**
 * DAL – שכבת גישה למסד הנתונים
 * מופע יחיד של PrismaClient לכל השרת (מונע חיבורים מיותרים בפיתוח).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const dal =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = dal;
}
