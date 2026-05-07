import { useParams } from 'wouter';
import { VerlaufLayout } from './verlauf/VerlaufLayout';
import { VerlaufFeed } from './verlauf/VerlaufFeed';
import { VerlaufTransactions } from './verlauf/VerlaufTransactions';
import { VerlaufNotifications } from './verlauf/VerlaufNotifications';

type VerlaufTab = 'feed' | 'transaktionen' | 'benachrichtigungen';

export function Verlauf(): React.JSX.Element {
  const { tab } = useParams<{ tab?: VerlaufTab }>();
  const activeTab = tab ?? 'feed';

  return (
    <VerlaufLayout activeTab={activeTab}>
      {activeTab === 'feed' && <VerlaufFeed />}
      {activeTab === 'transaktionen' && <VerlaufTransactions />}
      {activeTab === 'benachrichtigungen' && <VerlaufNotifications />}
    </VerlaufLayout>
  );
}
