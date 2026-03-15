const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

/**
 * Returns headers with the API key included.
 * Use for unauthenticated requests (login, register, etc.)
 */
export function apiHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'x-api-key': API_KEY,
    ...additionalHeaders,
  };
}

/**
 * Returns headers with API key + Bearer auth token.
 * Use for authenticated requests.
 */
export function authHeaders(token: string | null, additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'x-api-key': API_KEY,
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}
