import type { Role } from '@shared/types';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Mitglied',
};

import type { BadgeProps } from '../components/ui/Badge';

export const ROLE_STYLE: Record<Role, BadgeProps['variant']> = {
  admin: 'destructive-soft',
  moderator: 'accent-soft',
  member: 'primary-soft',
};
