import { useParams } from 'wouter';
import { StatsLayout } from './StatsLayout';
import { PersonalStatsContent } from './PersonalStats';
import { SystemStatsContent } from './SystemStats';
import { useAuth } from '../../hooks/useAuth';

export function StatsPage(): React.JSX.Element {
  const { userId, type } = useParams<{ userId?: string; type?: string }>();
  const { user: currentUser } = useAuth();

  // URL structure: /stats (personal) or /stats/system or /stats/:userId or /stats/:userId/system
  const activeTab = userId === 'system' || type === 'system' ? 'system' : 'personal';
  const targetId = userId && userId !== 'system' ? userId : currentUser?.id;

  return (
    <StatsLayout activeTab={activeTab} userId={targetId}>
      {activeTab === 'personal' ? (
        <PersonalStatsContent targetId={targetId} />
      ) : (
        <SystemStatsContent />
      )}
    </StatsLayout>
  );
}
