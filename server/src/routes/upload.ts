import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { groupMembers, groups, users } from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';

const router = new Hono();

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const uploadRateLimit = rateLimit(10, 3600, (c) => `rl:upload:${c.get('user').id}`);

export function getUploadDir(): string {
  return UPLOAD_DIR;
}

async function processAndSave(
  buffer: Buffer,
  width: number,
  height: number,
  fit: 'cover' | 'inside',
): Promise<string> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_MIME.has(type.mime)) {
    throw Object.assign(new Error('Nur Bilddateien sind erlaubt (jpeg, png, webp, gif)'), {
      status: 422,
      code: 'INVALID_FILE_TYPE',
    });
  }

  const processed = await sharp(buffer)
    .resize(width, height, { fit, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const filename = `${randomUUID()}.webp`;
  await writeFile(join(UPLOAD_DIR, filename), processed);
  return filename;
}

async function deleteOldFile(url: string | null): Promise<void> {
  if (!url) return;
  const prefix = '/api/uploads/';
  if (!url.startsWith(prefix)) return;
  const filename = url.slice(prefix.length);
  if (!filename || filename.includes('/') || filename.includes('..')) return;
  try {
    await unlink(join(UPLOAD_DIR, filename));
  } catch {
    // Ignore missing files
  }
}

// ─── POST /api/upload/avatar ──────────────────────────────────────────────────

router.post('/avatar', requireAuth, uploadRateLimit, async (c) => {
  const body = await c.req.parseBody();
  const file = body.image;

  if (!(file instanceof File)) {
    return c.json({ error: 'Kein Bild übermittelt', code: 'MISSING_FILE' }, 422);
  }
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'Datei zu groß (max 2 MB)', code: 'FILE_TOO_LARGE' }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = await processAndSave(buffer, 512, 512, 'cover');
  const avatarUrl = `/api/uploads/${filename}`;

  const user = c.get('user');
  const [current] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, user.id));
  await deleteOldFile(current?.avatarUrl ?? null);

  await db.update(users).set({ avatarUrl, updatedAt: new Date() }).where(eq(users.id, user.id));

  return c.json({ avatarUrl });
});

// ─── POST /api/upload/groups/:id/image ────────────────────────────────────────

router.post('/groups/:id/image', requireAuth, uploadRateLimit, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, id), eq(groups.isActive, true)));
  if (!group) return c.json({ error: 'Gruppe nicht gefunden', code: 'NOT_FOUND' }, 404);

  const [membership] = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, id),
        eq(groupMembers.userId, user.id),
        isNull(groupMembers.leftAt),
      ),
    );
  if (membership?.role !== 'owner') {
    return c.json({ error: 'Nur Gruppen-Inhaber dürfen das Bild ändern', code: 'FORBIDDEN' }, 403);
  }

  const body = await c.req.parseBody();
  const file = body.image;

  if (!(file instanceof File)) {
    return c.json({ error: 'Kein Bild übermittelt', code: 'MISSING_FILE' }, 422);
  }
  if (file.size > MAX_SIZE) {
    return c.json({ error: 'Datei zu groß (max 2 MB)', code: 'FILE_TOO_LARGE' }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = await processAndSave(buffer, 800, 800, 'inside');
  const imageUrl = `/api/uploads/${filename}`;

  await deleteOldFile(group.imageUrl ?? null);
  await db.update(groups).set({ imageUrl }).where(eq(groups.id, id));

  return c.json({ imageUrl });
});

export default router;
