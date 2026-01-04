import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Log database connection info (without exposing password)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const host = dbUrl.match(/\/\/([^:]+):([^@]+)@([^\/]+)/)?.[3] || 'unknown';
  console.log('[Prisma] Database host:', host);
  console.log('[Prisma] Environment:', process.env.NODE_ENV);
} else {
  console.error('[Prisma] DATABASE_URL is not set!');
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Helper function to retry database operations (useful for Render free tier wake-up)
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || '';

      // Check if it's a connection error that might resolve with retry
      const isRetryable =
        errorMessage.includes('Server has closed the connection') ||
        errorMessage.includes('Connection refused') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Connection terminated') ||
        errorMessage.includes('connect ETIMEDOUT');

      if (isRetryable && attempt < maxRetries) {
        console.log(`[Prisma] Connection attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        throw lastError;
      }
    }
  }

  throw lastError;
}
