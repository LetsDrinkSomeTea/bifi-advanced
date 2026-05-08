import type { FeedEntry } from '../hooks/useFeed';
import { FeedItem, type GroupedFeedEntry } from './FeedItem';
import { APP_TZ } from '../lib/utils';
import { groupEntries } from '../lib/feed';
import { Button } from './ui/Button';
import { Mailbox } from 'lucide-react';
export type { GroupedFeedEntry };

type TimelineItem =
  | { kind: 'entry'; entry: GroupedFeedEntry }
  | { kind: 'separator'; label: string; key: string };

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Heute';
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: APP_TZ,
  });
}

function buildTimeline(entries: GroupedFeedEntry[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let lastDate = '';
  for (const entry of entries) {
    const dateKey = new Date(entry.createdAt).toDateString();
    if (dateKey !== lastDate) {
      items.push({
        kind: 'separator',
        label: getDateLabel(entry.createdAt),
        key: `sep-${dateKey}`,
      });
      lastDate = dateKey;
    }
    items.push({ kind: 'entry', entry });
  }
  return items;
}

interface Props {
  entries: FeedEntry[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  preGrouped?: boolean;
}

export function FeedTimeline({
  entries,
  isLoading,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  preGrouped,
}: Props): React.JSX.Element {
  if (isLoading ?? false) {
    return (
      <div className="space-y-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
        <Mailbox className="mx-auto mb-2 opacity-20" size={32} />
        <p className="text-sm">Noch keine Aktivitäten.</p>
      </div>
    );
  }

  const grouped = (preGrouped ?? false) ? (entries as GroupedFeedEntry[]) : groupEntries(entries);
  const items = buildTimeline(grouped);

  return (
    <div>
      {items.map((item, i) => {
        if (item.kind === 'separator') {
          return (
            <div key={item.key} className="flex items-center gap-3 py-1.5 my-1">
              <div className="w-8 flex-shrink-0" />
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {item.label}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          );
        }
        const next = items[i + 1];
        return (
          <FeedItem key={item.entry.id} entry={item.entry} hasConnector={next?.kind === 'entry'} />
        );
      })}

      {(hasNextPage ?? false) ? (
        <Button
          variant="outline"
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
          className="w-full mt-4 rounded-xl text-muted-foreground"
        >
          {(isFetchingNextPage ?? false) ? 'Laden…' : 'Mehr anzeigen'}
        </Button>
      ) : null}
    </div>
  );
}
