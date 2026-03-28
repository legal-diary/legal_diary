'use client';

import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { authHeaders } from '@/lib/apiClient';
import { useCallback, useRef } from 'react';

interface DashboardResponse {
  date: string;
  todayHearings: {
    hearings: any[];
    totalCount: number;
  };
  upcomingHearings: any[];
  cases: any[];
  pendingClosures: any[];
  totalPendingCount: number;
  closedHearings: any[];
}

// ETag-aware fetcher: sends If-None-Match, returns cached data on 304
const createDashboardFetcher = (token: string | null, etagRef: React.MutableRefObject<string | null>, cachedDataRef: React.MutableRefObject<DashboardResponse | null>) => {
  return async (url: string): Promise<DashboardResponse> => {
    if (!token) throw new Error('No token');

    const headers: Record<string, string> = {
      ...authHeaders(token),
    };

    // Send ETag for conditional request
    if (etagRef.current) {
      headers['If-None-Match'] = etagRef.current;
    }

    const response = await fetch(url, { headers });

    // 304 Not Modified — data hasn't changed, return cached
    if (response.status === 304 && cachedDataRef.current) {
      return cachedDataRef.current;
    }

    if (!response.ok) {
      throw new Error(`Dashboard fetch failed: ${response.status}`);
    }

    // Store the new ETag
    const newEtag = response.headers.get('etag');
    if (newEtag) {
      etagRef.current = newEtag;
    }

    const data: DashboardResponse = await response.json();
    cachedDataRef.current = data;
    return data;
  };
};

const POLLING_INTERVAL = 30_000; // 30 seconds

export function useDashboardSWR() {
  const { token, user } = useAuth();
  const etagRef = useRef<string | null>(null);
  const cachedDataRef = useRef<DashboardResponse | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  // Memoize fetcher to avoid re-creating on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetcher = useCallback(
    createDashboardFetcher(token, etagRef, cachedDataRef),
    [token]
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardResponse>(
    // Key: only fetch when token exists
    token ? '/api/dashboard' : null,
    fetcher,
    {
      // Poll every 30s, but ONLY for admins
      refreshInterval: isAdmin ? POLLING_INTERVAL : 0,

      // Refetch when user returns to the tab
      revalidateOnFocus: true,

      // Don't refetch on reconnect for non-admins
      revalidateOnReconnect: isAdmin,

      // Deduplicate requests within 5s window
      dedupingInterval: 5_000,

      // Keep previous data while revalidating (no flicker)
      keepPreviousData: true,

      // Don't show error on 304 responses
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5_000,

      // Pause polling when page is not visible (tab hidden)
      refreshWhenHidden: false,

      // Don't poll when offline
      refreshWhenOffline: false,
    }
  );

  // Manual refresh (for after CRUD operations)
  const refresh = useCallback(() => {
    // Clear ETag to force full fetch after mutations
    etagRef.current = null;
    return mutate();
  }, [mutate]);

  return {
    data,
    error,
    isLoading,       // True only on first load (no cached data)
    isValidating,    // True during any fetch (including background polls)
    refresh,
    isPolling: isAdmin,
  };
}
