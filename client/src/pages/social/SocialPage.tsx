import { useParams } from 'wouter';
import { SocialLayout } from './SocialLayout';
import { SocialMainContent } from './SocialMain';
import { SocialActivityContent } from './SocialActivity';
import { SocialLeaderboardContent } from './SocialLeaderboard';

type SocialTab = 'social' | 'activity' | 'leaderboard';

export function SocialPage(): React.JSX.Element {
  const { tab } = useParams<{ tab?: SocialTab }>();
  const activeTab = tab ?? 'social';

  return (
    <SocialLayout activeTab={activeTab}>
      {activeTab === 'social' && <SocialMainContent />}
      {activeTab === 'activity' && <SocialActivityContent />}
      {activeTab === 'leaderboard' && <SocialLeaderboardContent />}
    </SocialLayout>
  );
}
