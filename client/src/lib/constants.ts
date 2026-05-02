import type { Role } from '@shared/types';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Mitglied',
};

export const ROLE_STYLE: Record<Role, string> = {
  admin: 'bg-primary/10 text-primary',
  moderator: 'bg-purple-500/10 text-purple-500',
  member: 'bg-muted text-muted-foreground',
};
