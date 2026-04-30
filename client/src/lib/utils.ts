import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelative(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  if (diffH < 24) return `vor ${diffH} Std.`
  if (diffD < 7) return `vor ${diffD} Tag${diffD === 1 ? '' : 'en'}`
  return formatDate(date)
}

export function formatTimestamp(date: string | Date): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMin = Math.floor((now - then) / 60_000)

  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`

  const d = new Date(date)
  const timeStr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return timeStr

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `gestern, ${timeStr}`

  const dateStr = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  return `${dateStr}, ${timeStr}`
}

export function balanceColor(cents: number): string {
  if (cents > 500) return 'text-green-500'
  if (cents >= 0) return 'text-yellow-500'
  return 'text-red-500'
}
