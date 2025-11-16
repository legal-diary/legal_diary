import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate session token using cryptographically secure random bytes
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}
