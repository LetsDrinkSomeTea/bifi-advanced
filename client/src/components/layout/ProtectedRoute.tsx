import { Redirect } from 'wouter';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LEVEL, type Role } from '@shared/types';

interface Props {
  children: React.ReactNode;
  requireRole?: Role;
}

export function ProtectedRoute({ children, requireRole }: Props): React.JSX.Element {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm">Laden…</div>
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;

  if (requireRole && ROLE_LEVEL[user.role] < ROLE_LEVEL[requireRole]) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}
