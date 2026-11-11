import { and, isNotNull, lt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { broadcastInvalidate } from './notifications.ts';
import { type AUDIT_SEVERITIES } from '../../../shared/src/schemas.ts';

type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

interface AuditEntry {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  resourceName?: string | null;
  changes?: Record<string, unknown> | null;
  severity?: AuditSeverity;
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
    severity: entry.severity ?? 'low',
    ipAddress: entry.ipAddress ?? null,
  });

  broadcastInvalidate(['audit-log']);
}

/** How long the IP address of an audit log entry is kept. The entry itself stays. */
export const AUDIT_IP_RETENTION_DAYS = 30;

/** Removes IP addresses from audit log entries older than the retention period. */
export async function pruneAuditIpAddresses(
  retentionDays: number = AUDIT_IP_RETENTION_DAYS,
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const pruned = await db
    .update(auditLogs)
    .set({ ipAddress: null })
    .where(and(isNotNull(auditLogs.ipAddress), lt(auditLogs.createdAt, cutoff)))
    .returning({ id: auditLogs.id });
  return pruned.length;
}
