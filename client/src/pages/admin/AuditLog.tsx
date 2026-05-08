import { useState } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  Clock,
  Database,
  Globe,
} from 'lucide-react';
import { useAuditLog } from '../../hooks/useAdmin';
import { useAuth } from '../../hooks/useAuth';
import type { AuditLogEntry } from '@shared/types';
import { AUDIT_SEVERITIES } from '@shared/schemas';
import { cn, formatRelative } from '../../lib/utils';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

const SEVERITY_BADGE: Record<
  AuditSeverity,
  { variant: 'muted-soft' | 'confirm-soft' | 'accent-soft' | 'destructive-soft'; label: string }
> = {
  info: { variant: 'muted-soft', label: 'Info' },
  low: { variant: 'confirm-soft', label: 'Low' },
  medium: { variant: 'accent-soft', label: 'Medium' },
  high: { variant: 'destructive-soft', label: 'High' },
};

// ─── Audit Log Card Component ─────────────────────────────────────────────────

interface ChangesData {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  [key: string]: unknown;
}

function ChangesView({
  changes,
}: {
  changes: ChangesData | null | undefined;
}): React.JSX.Element | null {
  if (!changes) return null;

  const { before, after } = changes;
  const IGNORE_KEYS = ['updatedAt', 'createdAt', 'passwordHash', 'id', 'updated_at', 'created_at'];

  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined) return '-';
    if (typeof v === 'boolean') return v ? 'Ja' : 'Nein';
    if (typeof v === 'object') return JSON.stringify(v);
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    return 'Complex';
  };

  // Case: Update (Both before and after exist)
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    const changedKeys = Object.keys(after).filter((key) => {
      if (IGNORE_KEYS.includes(key)) return false;
      const bVal = before[key];
      const aVal = after[key];
      return JSON.stringify(bVal) !== JSON.stringify(aVal);
    });

    if (changedKeys.length === 0) {
      return (
        <p className="text-[10px] italic text-muted-foreground">Keine relevanten Änderungen.</p>
      );
    }

    return (
      <div className="space-y-1.5">
        {changedKeys.map((key) => (
          <div
            key={key}
            className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[11px] border-b border-border/30 pb-1 last:border-0"
          >
            <span className="font-bold text-muted-foreground min-w-[100px]">{key}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="line-through text-destructive-strong opacity-70 bg-destructive/5 px-1 rounded">
                {formatValue(before[key])}
              </span>
              <span className="text-muted-foreground">➔</span>
              <span className="text-confirm-strong font-bold bg-confirm/5 px-1 rounded">
                {formatValue(after[key])}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Case: Create / Single state (only after or just the object)
  const displayObj = after ?? changes.after ?? (before ? null : changes);
  if (!displayObj || typeof displayObj !== 'object') {
    if (before)
      return <p className="text-[10px] text-destructive-strong font-bold">Ressource gelöscht.</p>;
    return null;
  }

  const keys = Object.keys(displayObj).filter(
    (k) => !IGNORE_KEYS.includes(k) && displayObj[k] !== null,
  );

  return (
    <div className="space-y-1">
      {keys.map((key) => (
        <div
          key={key}
          className="flex justify-between text-[11px] border-b border-border/30 pb-1 last:border-0"
        >
          <span className="font-bold text-muted-foreground">{key}</span>
          <span className="font-mono text-foreground text-right">
            {formatValue(displayObj[key])}
          </span>
        </div>
      ))}
    </div>
  );
}

function AuditLogCard({
  entry,
  isExpanded,
  onToggleExpand,
}: {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}): React.JSX.Element {
  const getBadgeVariant = (
    action: string,
  ): 'primary-soft' | 'confirm-soft' | 'accent-soft' | 'secondary-soft' | 'muted-soft' => {
    if (action.startsWith('user.')) return 'primary-soft';
    if (action === 'deposit') return 'confirm-soft';
    if (action.startsWith('transaction.')) return 'accent-soft';
    if (action.startsWith('buyable.') || action.startsWith('variant.')) return 'secondary-soft';
    if (action.startsWith('promotion.')) return 'muted-soft';
    return 'muted-soft';
  };

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200 overflow-hidden',
        isExpanded ? 'border-primary bg-primary/5' : 'border-border bg-card',
      )}
    >
      <div
        className="px-4 py-3 flex items-start gap-3 cursor-pointer"
        onClick={() => {
          onToggleExpand(entry.id);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant={getBadgeVariant(entry.action)} className="text-[10px] font-mono h-5">
              {entry.action}
            </Badge>
            <Badge variant={SEVERITY_BADGE[entry.severity].variant} className="text-[10px] h-5">
              {SEVERITY_BADGE[entry.severity].label}
            </Badge>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} />
              {formatRelative(entry.createdAt)}
            </span>
          </div>

          {entry.resourceName ? (
            <p className="text-xs font-bold text-foreground mb-1">{entry.resourceName}</p>
          ) : null}

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <UserIcon size={12} className="text-muted-foreground" />
              {entry.actorDisplayName ?? 'System'}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Database size={12} />
              {entry.resourceType}
              {entry.resourceId ? (
                <code className="text-[10px] bg-muted px-1 rounded">
                  {entry.resourceId.slice(0, 8)}…
                </code>
              ) : null}
            </span>
          </div>
        </div>
        <div className="ml-1 text-muted-foreground mt-1">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isExpanded ? (
        <div className="px-4 pb-4 pt-2 border-t border-primary/10 space-y-3">
          {entry.ipAddress ? (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Globe size={10} />
              IP: {entry.ipAddress}
            </div>
          ) : null}

          {entry.changes ? (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Details
              </p>
              <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                <ChangesView changes={entry.changes} />
              </div>
            </div>
          ) : (
            <p className="text-[10px] italic text-muted-foreground">Keine Details verfügbar.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Content ──────────────────────────────────────────────────────────────

export function AdminAuditLogContent(): React.JSX.Element {
  const { isAdmin } = useAuth();
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAuditLog({
    action: actionFilter || undefined,
    resourceType: resourceTypeFilter || undefined,
    severity: severityFilter ? (severityFilter as AuditSeverity) : undefined,
  });

  const toggleExpand = (id: string): void => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!isAdmin) return <></>;

  const allEntries = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Audit-Log
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Kategorie
            </label>
            <Select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
              }}
              className="h-9 text-xs"
            >
              <option value="">Alle Aktionen</option>
              <option value="auth.">Auth</option>
              <option value="user.">Nutzer</option>
              <option value="deposit">Einzahlung</option>
              <option value="transaction.">Transaktion</option>
              <option value="buyable.">Produkt</option>
              <option value="variant.">Variante</option>
              <option value="promotion.">Rabatt</option>
              <option value="prost.">Prost</option>
              <option value="jackpot.">Jackpot</option>
              <option value="nudge.">Nudge</option>
              <option value="friend.">Freunde</option>
              <option value="group.">Gruppe</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Ressource
            </label>
            <Select
              value={resourceTypeFilter}
              onChange={(e) => {
                setResourceTypeFilter(e.target.value);
              }}
              className="h-9 text-xs"
            >
              <option value="">Alle Typen</option>
              <option value="user">User</option>
              <option value="transaction">Transaction</option>
              <option value="buyable">Buyable</option>
              <option value="variant">Variant</option>
              <option value="promotion">Promotion</option>
              <option value="group">Gruppe</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
              Schwere
            </label>
            <Select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
              }}
              className="h-9 text-xs"
            >
              <option value="">Alle</option>
              {AUDIT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_BADGE[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {allEntries.map((entry) => (
            <AuditLogCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedId === entry.id}
              onToggleExpand={toggleExpand}
            />
          ))}

          {allEntries.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <p>Keine Einträge gefunden.</p>
            </div>
          )}

          {hasNextPage ? (
            <div className="pt-2">
              <Button
                onClick={() => {
                  void fetchNextPage();
                }}
                disabled={isFetchingNextPage}
                variant="outline"
                className="w-full"
              >
                {isFetchingNextPage ? 'Lädt…' : 'Mehr laden'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
