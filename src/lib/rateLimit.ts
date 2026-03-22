// Database-backed rate limiter for serverless environments (Vercel)
// Uses PostgreSQL via Prisma to persist rate limit state across invocations

import { prisma } from '@/lib/prisma';

// Configuration - email-based (login)
const MAX_ATTEMPTS = 5; // Maximum login attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minute window
const LOCKOUT_MS = 60 * 60 * 1000; // 1 hour lockout

// Configuration - IP-based (public endpoints)
const IP_MAX_ATTEMPTS = 20;
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minute window

// ==========================================
// Core helpers
// ==========================================

async function getOrCreateRecord(key: string, windowMs: number) {
  const now = new Date();

  const record = await prisma.rateLimit.findUnique({ where: { key } });

  if (!record || now > record.resetAt) {
    // Window expired or no record — reset
    return prisma.rateLimit.upsert({
      where: { key },
      update: {
        attempts: 0,
        resetAt: new Date(Date.now() + windowMs),
        lockedUntil: null,
      },
      create: {
        key,
        attempts: 0,
        resetAt: new Date(Date.now() + windowMs),
      },
    });
  }

  return record;
}

// ==========================================
// Email-based rate limiting (login)
// ==========================================

/**
 * Check if an email is currently rate limited
 */
export async function isRateLimited(email: string): Promise<boolean> {
  const now = new Date();
  const record = await prisma.rateLimit.findUnique({
    where: { key: `email:${email}` },
  });

  if (!record) return false;

  // Check lockout
  if (record.lockedUntil && now < record.lockedUntil) {
    return true;
  }

  // Check if window expired
  if (now > record.resetAt) {
    return false;
  }

  return record.attempts >= MAX_ATTEMPTS;
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(email: string): Promise<number> {
  const key = `email:${email}`;
  const record = await getOrCreateRecord(key, WINDOW_MS);

  const newAttempts = record.attempts + 1;

  await prisma.rateLimit.update({
    where: { key },
    data: {
      attempts: newAttempts,
      // Lock out if max attempts reached
      ...(newAttempts >= MAX_ATTEMPTS
        ? { lockedUntil: new Date(Date.now() + LOCKOUT_MS) }
        : {}),
    },
  });

  return newAttempts;
}

/**
 * Clear rate limit for an email (on successful login)
 */
export async function clearRateLimit(email: string): Promise<void> {
  await prisma.rateLimit.delete({
    where: { key: `email:${email}` },
  }).catch(() => {}); // Ignore if not found
}

/**
 * Get remaining attempts for an email
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  const record = await prisma.rateLimit.findUnique({
    where: { key: `email:${email}` },
  });

  if (!record || new Date() > record.resetAt) {
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - record.attempts);
}

/**
 * Get time until rate limit reset (in seconds)
 */
export async function getResetTime(email: string): Promise<number> {
  const now = new Date();
  const record = await prisma.rateLimit.findUnique({
    where: { key: `email:${email}` },
  });

  if (!record) return 0;

  // If locked out, return lockout remaining time
  if (record.lockedUntil && now < record.lockedUntil) {
    return Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000);
  }

  if (now > record.resetAt) return 0;

  return Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000);
}

// ==========================================
// IP-based rate limiting (public endpoints)
// ==========================================

/**
 * Check if an IP is currently rate limited
 */
export async function isIpRateLimited(ip: string): Promise<boolean> {
  const record = await prisma.rateLimit.findUnique({
    where: { key: `ip:${ip}` },
  });

  if (!record) return false;
  if (new Date() > record.resetAt) return false;

  return record.attempts >= IP_MAX_ATTEMPTS;
}

/**
 * Record a request from an IP address
 */
export async function recordIpAttempt(ip: string): Promise<number> {
  const key = `ip:${ip}`;
  const record = await getOrCreateRecord(key, IP_WINDOW_MS);

  const newAttempts = record.attempts + 1;

  await prisma.rateLimit.update({
    where: { key },
    data: { attempts: newAttempts },
  });

  return newAttempts;
}

/**
 * Extract client IP from request headers (works with Vercel/proxies)
 */
export function getClientIp(request: Request): string {
  const forwarded = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return forwarded || 'unknown';
}

// ==========================================
// Cleanup (call periodically or via cron)
// ==========================================

/**
 * Remove expired rate limit records to prevent table bloat
 */
export async function cleanupExpiredRecords(): Promise<number> {
  const now = new Date();
  const result = await prisma.rateLimit.deleteMany({
    where: {
      resetAt: { lt: now },
      OR: [
        { lockedUntil: null },
        { lockedUntil: { lt: now } },
      ],
    },
  });
  return result.count;
}
