import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';

interface AuditEntry {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  changes?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId ?? null,
    changes: entry.changes ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}
