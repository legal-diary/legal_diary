import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Log database connection info (without exposing password)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const host = dbUrl.match(/\/\/([^:]+):([^@]+)@([^:]+)/)?.[3] || 'unknown';
  console.log('[Prisma] Database host:', host);
  console.log('[Prisma] Environment:', process.env.NODE_ENV);
} else {
  console.error('[Prisma] DATABASE_URL is not set!');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
