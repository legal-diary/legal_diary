// Simple in-memory rate limiter for protecting against brute-force attacks
// In production, consider using Redis or a proper rate-limiting service

interface RateLimitRecord {
  attempts: number;
  resetTime: number;
}

// Store for rate limit records (email -> record)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Configuration
const MAX_ATTEMPTS = 5; // Maximum login attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minute window
const LOCKOUT_MS = 60 * 60 * 1000; // 1 hour lockout

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
