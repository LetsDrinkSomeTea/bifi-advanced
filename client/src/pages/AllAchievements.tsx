import { useParams, useLocation } from 'wouter';
import { Layout } from '../components/layout/Layout';
import { PageHeader } from '../components/PageHeader';
import { AchievementGrid } from '@/components/AchievementGrid';
import { usePublicProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';

export function AllAchievements(): React.JSX.Element {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();

  const targetId = userId ?? currentUser?.id;
  const isOwn = !userId || userId === currentUser?.id;

  const { data: profile, isLoading } = usePublicProfile(targetId);

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <PageHeader
          title={isOwn ? 'Meine Achievements' : `${profile?.displayName ?? '...'}'s Achievements`}
          onBack={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate(isOwn ? '/profile' : `/profile/${userId}`);
            }
          }}
        />

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
  );
}
