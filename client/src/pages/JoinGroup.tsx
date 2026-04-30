import { useEffect, useRef } from 'react'
import { useParams, useLocation } from 'wouter'
import { Layout } from '../components/layout/Layout'
import { useJoinGroup } from '../hooks/useGroups'
import { useAuth } from '../hooks/useAuth'

export function JoinGroup() {
  const { code } = useParams<{ code: string }>()
  const [, navigate] = useLocation()
  const { user } = useAuth()
  const { mutate: join } = useJoinGroup()
  const attempted = useRef(false)

  useEffect(() => {
    if (!user || !code || attempted.current) return
    attempted.current = true

    join(code.toUpperCase(), {
      onSuccess: (group) => {
        navigate(`/groups/${group.id}`, { replace: true })
      },
      onError: (err) => {
        const code = (err as Error & { code?: string }).code
        if (code === 'ALREADY_MEMBER') {
          // Don't have the group id here, send to social page
          navigate('/social', { replace: true })
        }
        // Otherwise stay on page and show error
      },
    })
  }, [user, code])

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Gruppe wird beigetreten…</p>
      </div>
    </Layout>
  )
}
