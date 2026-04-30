import { useParams, useLocation } from 'wouter'
import { ArrowLeft, Award } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { AchievementGrid } from '@/components/AchievementGrid'
import { usePublicProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'
export function AllAchievements() {
  const { userId } = useParams<{ userId?: string }>()
  const { user: currentUser } = useAuth()
  const [, navigate] = useLocation()

  const targetId = userId ?? currentUser?.id
  const isOwn = !userId || userId === currentUser?.id

  const { data: profile, isLoading } = usePublicProfile(targetId)

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(isOwn ? '/profile' : `/profile/${userId}`)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">
            {isOwn ? 'Meine Achievements' : `${profile?.displayName ?? '...'}'s Achievements`}
          </h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <AchievementGrid
            achievements={profile?.achievements ?? []}
            progress={profile?.achievementProgress}
          />
        )}
      </div>
    </Layout>
  )
}
