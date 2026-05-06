import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from './useAuth';
import { type NotificationType } from '@shared/types';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  relatedId: string | null;
  createdAt: string;
}

export function useNotifications(): UseQueryResult<AppNotification[]> {
  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get<AppNotification[]>('/api/notifications'),
    staleTime: 30_000,
  });
}

export function useMarkRead(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/notifications/${id}/read`, {}),
    onSuccess: (_, id) => {
      qc.setQueryData<AppNotification[]>(
        ['notifications'],
        (old) => old?.filter((n) => n.id !== id) ?? [],
      );
    },
  });
}

export function useMarkAllRead(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/notifications/read-all', {}),
    onSuccess: () => {
      qc.setQueryData(['notifications'], []);
    },
  });
}

// ─── SSE connection ───────────────────────────────────────────────────────────

export interface SSEState {
  unreadCount: number;
  setUnreadCount: Dispatch<SetStateAction<number>>;
}

export function useSSE(): SSEState {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const connect = (): void => {
      const es = new EventSource('/api/notifications/stream', { withCredentials: true });
      esRef.current = es;

      es.addEventListener('connected', (e) => {
        const data = JSON.parse((e as MessageEvent<string>).data) as { unreadCount: number };
        setUnreadCount(data.unreadCount);
      });

      es.addEventListener('notification', (e) => {
        const notif = JSON.parse((e as MessageEvent<string>).data) as AppNotification;
        qc.setQueryData<AppNotification[]>(['notifications'], (old) => [notif, ...(old ?? [])]);
        setUnreadCount((c) => c + 1);
      });

      es.addEventListener('unread_count', (e) => {
        const { count } = JSON.parse((e as MessageEvent<string>).data) as { count: number };
        setUnreadCount(count);
      });

      es.addEventListener('invalidate', (e) => {
        const { keys } = JSON.parse((e as MessageEvent<string>).data) as { keys: string[] };
        for (const key of keys) {
          if (key === 'feed') void qc.invalidateQueries({ queryKey: ['feed'] });
          else if (key === 'balance') void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
          else if (key === 'transactions')
            void qc.invalidateQueries({ queryKey: ['transactions'] });
          else if (key === 'vouchers')
            void qc.invalidateQueries({ queryKey: ['prost', 'vouchers'] });
          else if (key === 'leaderboard') void qc.invalidateQueries({ queryKey: ['leaderboard'] });
          else if (key === 'profile') void qc.invalidateQueries({ queryKey: ['profile'] });
          else if (key === 'buyables') {
            void qc.invalidateQueries({ queryKey: ['buyables'] });
            void qc.invalidateQueries({ queryKey: ['favorites'] });
          } else if (key === 'audit-log') {
            void qc.invalidateQueries({ queryKey: ['admin', 'audit-log'] });
          }
        }
      });

      es.addEventListener('ping', () => {
        /* No-op */
      });

      es.onerror = () => {
        es.close();
        // Reconnect after 5 s
        setTimeout(connect, 5_000);
      };
    };

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [isAuthenticated, qc]);

  return { unreadCount, setUnreadCount };
}
