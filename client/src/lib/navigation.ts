export const FLAT_ROUTE_SEQUENCE = [
  '/',
  '/shop',
  '/social',
  '/social/leaderboard',
  '/verlauf',
  '/verlauf/transaktionen',
  '/verlauf/benachrichtigungen',
  '/profile',
];

export function routeIndex(path: string): number {
  const exact = FLAT_ROUTE_SEQUENCE.indexOf(path);
  if (exact !== -1) return exact;
  return FLAT_ROUTE_SEQUENCE.findIndex((r) => r !== '/' && path.startsWith(r));
}
