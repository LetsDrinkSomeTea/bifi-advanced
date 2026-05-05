import { z } from 'zod';

export function isSafeImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:') {
      return true;
    }
    return process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const SafeImageUrlSchema = z
  .string()
  .url()
  .refine(isSafeImageUrl, { message: 'Only https URLs are allowed in production' });
