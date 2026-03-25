import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/apiClient';

export function usePendingTodoCount() {
  const { token } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/todos/pending-count', {
        headers: authHeaders(token),
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.pendingCount);
      }
    } catch {
      // Silent fail - badge is non-critical
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { pendingCount, refresh };
}
