import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set',
    database: 'Unknown',
    errors: [] as string[],
  };

  // Test database connection
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'Connected';
  } catch (error) {
    checks.database = 'Failed';
    if (error instanceof Error) {
      checks.errors.push(error.message);
      console.error('[Health Check] Database error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }

  const isHealthy = checks.database === 'Connected';

  return NextResponse.json(
    checks,
    { status: isHealthy ? 200 : 503 }
  );
}
