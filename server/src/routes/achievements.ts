import { Hono } from 'hono';
import { ACHIEVEMENT_REGISTRY } from '../services/achievements/registry.ts';

const app = new Hono();

app.get('/meta', (c) => {
  const publicMeta: Omit<(typeof ACHIEVEMENT_REGISTRY)[number], 'check' | 'events' | 'progress'>[] =
    [];
  const hiddenGroups = new Set<string>();
  let hiddenStandaloneCount = 0;

  for (const def of ACHIEVEMENT_REGISTRY) {
    if (def.hidden) {
      if (def.groupKey) hiddenGroups.add(def.groupKey);
      else hiddenStandaloneCount++;
    } else {
      const { check: _check, events: _events, progress: _progress, ...rest } = def;
      publicMeta.push(rest);
    }
  }

  const hiddenCount = hiddenGroups.size + hiddenStandaloneCount;

  return c.json({ publicMeta, hiddenCount });
});

export default app;
