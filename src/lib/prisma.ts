import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
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

/**
 * Execute database operations within a firm-scoped RLS context.
 *
 * Sets `app.current_firm_id` via SET LOCAL (transaction-scoped) before
 * running the callback. This ensures Supabase RLS policies enforce
 * firm isolation at the database level.
 *
 * Uses SET LOCAL so the variable is automatically cleared when the
 * transaction ends — safe with PgBouncer's transaction pooling mode.
 *
 * Usage:
 *   const cases = await withFirmContext(user.firmId, (tx) =>
 *     tx.case.findMany({ where: { status: 'ACTIVE' } })
 *   );
 */
export async function withFirmContext<T>(
  firmId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // SET LOCAL scopes the variable to this transaction only
    // Safe with PgBouncer — won't leak to other connections
    await tx.$executeRaw`SELECT set_config('app.current_firm_id', ${firmId}, true)`;
    return callback(tx);
  });
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
