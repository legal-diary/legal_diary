/**
 * Returns headers for unauthenticated requests (login, register, etc.)
 */
export function apiHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}

/**
 * Returns headers with Bearer auth token.
 * Use for authenticated requests.
 */
export function authHeaders(token: string | null, additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}
