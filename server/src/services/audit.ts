import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { broadcastInvalidate } from './notifications.ts';

interface AuditEntry {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceName?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  // If we have both before and after state, check if anything meaningful changed.
  // If not, we skip the audit log entry to avoid noise.
  if (entry.changes && typeof entry.changes === 'object') {
    const { before, after } = entry.changes as {
      before?: Record<string, unknown> | null;
      after?: Record<string, unknown> | null;
    };
    if (before && after && typeof before === 'object' && typeof after === 'object') {
      const IGNORE_KEYS = ['updatedAt', 'createdAt'];
      const hasChanges = Object.keys(after).some((key) => {
        if (IGNORE_KEYS.includes(key)) return false;
        // Deep equal check for the field value
        return JSON.stringify(before[key]) !== JSON.stringify(after[key]);
      });

      if (!hasChanges) return;
    }
  }

  await db.insert(auditLogs).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    resourceName: entry.resourceName ?? null,
    changes: entry.changes ?? null,
    ipAddress: entry.ipAddress ?? null,
  });

  broadcastInvalidate(['audit-log']);
}
