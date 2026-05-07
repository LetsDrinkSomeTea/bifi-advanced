import { useParams } from 'wouter';
import { SocialLayout } from './SocialLayout';
import { SocialMainContent } from './SocialMain';
import { SocialLeaderboardContent } from './SocialLeaderboard';

type SocialTab = 'social' | 'leaderboard';

export function SocialPage(): React.JSX.Element {
  const { tab } = useParams<{ tab?: SocialTab }>();
  const activeTab = (tab === 'leaderboard' ? 'leaderboard' : 'social') as SocialTab;

  return (
    <SocialLayout activeTab={activeTab}>
      {activeTab === 'social' && <SocialMainContent />}
      {activeTab === 'leaderboard' && <SocialLeaderboardContent />}
    </SocialLayout>
  );
}
