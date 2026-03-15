// Simple in-memory rate limiter for protecting against brute-force attacks
// In production, consider using Redis (Upstash) for persistent rate limiting on Vercel

interface RateLimitRecord {
  attempts: number;
  resetTime: number;
}

// Store for rate limit records (email -> record)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Store for IP-based rate limiting
const ipRateLimitStore = new Map<string, RateLimitRecord>();

// Configuration - email-based (login)
const MAX_ATTEMPTS = 5; // Maximum login attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minute window
const LOCKOUT_MS = 60 * 60 * 1000; // 1 hour lockout

// Configuration - IP-based (public endpoints)
const IP_MAX_ATTEMPTS = 20; // More generous than email-based
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minute window

// ==========================================
// Email-based rate limiting (login)
// ==========================================

/**
 * Check if an email is currently rate limited
 */
export function isRateLimited(email: string): boolean {
  const record = rateLimitStore.get(email);

  if (!record) {
    return false;
  }

  // Check if window has expired
  if (Date.now() > record.resetTime) {
    rateLimitStore.delete(email);
    return false;
  }

  // Check if attempt limit exceeded
  return record.attempts >= MAX_ATTEMPTS;
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): number {
  const record = rateLimitStore.get(email);
  const now = Date.now();

  if (!record || now > record.resetTime) {
    // Create new record
    const newRecord: RateLimitRecord = {
      attempts: 1,
      resetTime: now + WINDOW_MS,
    };
    rateLimitStore.set(email, newRecord);
    return 1;
  }

  // Increment attempts
  record.attempts++;
  return record.attempts;
}

/**
 * Clear rate limit for an email (on successful login)
 */
export function clearRateLimit(email: string): void {
  rateLimitStore.delete(email);
}

/**
 * Get remaining attempts for an email
 */
export function getRemainingAttempts(email: string): number {
  const record = rateLimitStore.get(email);

  if (!record || Date.now() > record.resetTime) {
    return MAX_ATTEMPTS;
  }

  return Math.max(0, MAX_ATTEMPTS - record.attempts);
}

/**
 * Get time until rate limit reset (in seconds)
 */
export function getResetTime(email: string): number {
  const record = rateLimitStore.get(email);

  if (!record || Date.now() > record.resetTime) {
    return 0;
  }

  return Math.ceil((record.resetTime - Date.now()) / 1000);
}

// ==========================================
// IP-based rate limiting (public endpoints)
// ==========================================

/**
 * Check if an IP is currently rate limited
 */
export function isIpRateLimited(ip: string): boolean {
  const record = ipRateLimitStore.get(ip);

  if (!record) {
    return false;
  }

  if (Date.now() > record.resetTime) {
    ipRateLimitStore.delete(ip);
    return false;
  }

  return record.attempts >= IP_MAX_ATTEMPTS;
}

/**
 * Record a request from an IP address
 */
export function recordIpAttempt(ip: string): number {
  const record = ipRateLimitStore.get(ip);
  const now = Date.now();

  if (!record || now > record.resetTime) {
    ipRateLimitStore.set(ip, {
      attempts: 1,
      resetTime: now + IP_WINDOW_MS,
    });
    return 1;
  }

  record.attempts++;
  return record.attempts;
}

/**
 * Extract client IP from request headers (works with Vercel/proxies)
 */
export function getClientIp(request: Request): string {
  const forwarded = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  return forwarded || 'unknown';
}
