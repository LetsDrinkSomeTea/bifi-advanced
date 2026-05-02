import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from './useAuth'

export interface AppNotification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  readAt: string | null
  relatedId: string | null
  createdAt: string
}

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get<AppNotification[]>('/api/notifications'),
    staleTime: 30_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/notifications/${id}/read`, {}),
    onSuccess: (_, id) => {
      qc.setQueryData<AppNotification[]>(['notifications'], (old) =>
        old?.filter((n) => n.id !== id) ?? [],
      )
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/notifications/read-all', {}),
    onSuccess: () => qc.setQueryData(['notifications'], []),
  })
}

// ─── SSE connection ───────────────────────────────────────────────────────────

export function useSSE() {
  const { isAuthenticated } = useAuth()
  const qc = useQueryClient()
  const [unreadCount, setUnreadCount] = useState(0)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const connect = () => {
      const es = new EventSource('/api/notifications/stream', { withCredentials: true })
      esRef.current = es

      es.addEventListener('connected', (e) => {
        const data = JSON.parse((e as MessageEvent).data) as { unreadCount: number }
        setUnreadCount(data.unreadCount)
      })

      es.addEventListener('notification', (e) => {
        const notif = JSON.parse((e as MessageEvent).data) as AppNotification
        qc.setQueryData<AppNotification[]>(['notifications'], (old) => [notif, ...(old ?? [])])
        setUnreadCount((c) => c + 1)
      })

      es.addEventListener('unread_count', (e) => {
        const { count } = JSON.parse((e as MessageEvent).data) as { count: number }
        setUnreadCount(count)
      })

      es.addEventListener('invalidate', (e) => {
        const { keys } = JSON.parse((e as MessageEvent).data) as { keys: string[] }
        for (const key of keys) {
          if (key === 'feed') qc.invalidateQueries({ queryKey: ['feed'] })
          else if (key === 'balance') qc.invalidateQueries({ queryKey: ['auth', 'me'] })
          else if (key === 'transactions') qc.invalidateQueries({ queryKey: ['transactions'] })
          else if (key === 'vouchers') qc.invalidateQueries({ queryKey: ['prost', 'vouchers'] })
          else if (key === 'leaderboard') qc.invalidateQueries({ queryKey: ['leaderboard'] })
          else if (key === 'profile') qc.invalidateQueries({ queryKey: ['profile'] })
          else if (key === 'buyables') {
            qc.invalidateQueries({ queryKey: ['buyables'] })
            qc.invalidateQueries({ queryKey: ['favorites'] })
          }
        }
      })

      es.addEventListener('ping', () => {})

      es.onerror = () => {
        es.close()
        // Reconnect after 5 s
        setTimeout(connect, 5_000)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      esRef.current = null
    }
  }, [isAuthenticated, qc])

  return { unreadCount, setUnreadCount }
}
