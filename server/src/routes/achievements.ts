import { Hono } from 'hono';
import { ACHIEVEMENT_REGISTRY } from '../services/achievements/registry.ts';

const app = new Hono();

app.get('/meta', (c) => {
  const meta = ACHIEVEMENT_REGISTRY.map(({ check: _check, events: _events, ...rest }) => rest);
  return c.json(meta);
});

export default app;
