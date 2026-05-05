import { z } from 'zod';

const CursorPayloadSchema = z.object({
  t: z.string(),
  id: z.string(),
});

export interface CursorPayload {
  t: string;
  id: string;
}

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id })).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed = CursorPayloadSchema.safeParse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
