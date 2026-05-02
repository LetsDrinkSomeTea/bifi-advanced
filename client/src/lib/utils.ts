import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const APP_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Converts an ISO date string to a local YYYY-MM-DDTHH:mm string for datetime-local inputs */
export function toLocalISO(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // sv-SE locale gives YYYY-MM-DD HH:mm:ss
  return d.toLocaleString('sv-SE', { timeZone: APP_TZ }).replace(' ', 'T').slice(0, 16);
}

/** Converts a local YYYY-MM-DDTHH:mm string to a UTC ISO string */
export function fromLocalISO(local: string | null | undefined): string | null {
  if (!local) return null;
  // We can't easily parse a local string into a specific TZ Date without a library like date-fns-tz
  // But we can assume the browser's current timezone is what the user intended if they used a picker.
  // However, for consistency, we'll try to create a date and then adjust if needed.
  // Standard new Date(localStr) uses browser TZ.
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TZ,
  }).format(new Date(date));
}

export function formatRelative(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffH < 24) return `vor ${diffH} Std.`;
  if (diffD < 7) return `vor ${diffD} Tag${diffD === 1 ? '' : 'en'}`;
  return formatDate(date);
}

export function formatTimestamp(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMin = Math.floor((now - then) / 60_000);

  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min.`;

  const d = new Date(date);
  const timeStr = d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TZ,
  });
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return timeStr;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `gestern, ${timeStr}`;

  const dateStr = d.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TZ,
  });
  return `${dateStr}, ${timeStr}`;
}

export function balanceColor(cents: number): string {
  if (cents > 500) return 'text-green-500';
  if (cents >= 0) return 'text-yellow-500';
  return 'text-red-500';
}
