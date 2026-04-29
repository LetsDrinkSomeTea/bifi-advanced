import { Redirect } from 'wouter'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '@shared/types'

const ROLE_LEVEL: Record<Role, number> = { member: 0, moderator: 1, admin: 2 }

interface Props {
  children: React.ReactNode
  requireRole?: Role
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm">Laden…</div>
      </div>
    )
  }

  if (!user) return <Redirect to="/login" />

  if (requireRole && ROLE_LEVEL[user.role] < ROLE_LEVEL[requireRole]) {
    return <Redirect to="/" />
  }

  return <>{children}</>
}
