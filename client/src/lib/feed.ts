import type { FeedEntry } from '../hooks/useFeed';
import { type GroupedFeedEntry } from '../components/FeedItem';

interface Item {
  name: string;
  variantName: string;
  count: number;
}

function mergeItems(a: Item[], b: Item[]): Item[] {
  const map = new Map<string, Item>();
  for (const item of [...a, ...b]) {
    const key = `${item.name}::${item.variantName}`;
    const existing = map.get(key);
    map.set(key, existing ? { ...existing, count: existing.count + item.count } : { ...item });
  }
  return Array.from(map.values());
}

export function groupEntries(entries: FeedEntry[]): GroupedFeedEntry[] {
  const result: GroupedFeedEntry[] = [];
  for (const entry of entries) {
    const last = result.at(-1);
    if (
      last !== undefined &&
      entry.type === 'purchase' &&
      last.type === 'purchase' &&
      entry.userId === last.userId
    ) {
      const lastItems = last.mergedItems ?? (last.metadata?.items as Item[] | undefined) ?? [];
      const newItems = (entry.metadata?.items as Item[] | undefined) ?? [];
      last.mergedItems = mergeItems(lastItems, newItems);
    } else {
      result.push({ ...entry });
    }
  }
  return result;
}
