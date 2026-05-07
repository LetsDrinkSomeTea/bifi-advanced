import { useLocation } from 'wouter';
import { Layout } from '../../components/layout/Layout';
import { Tabs, TabContent, type TabItem } from '../../components/ui/Tabs';
import { useNotifications } from '../../hooks/useNotifications';

interface Props {
  children: React.ReactNode;
  activeTab: 'feed' | 'transaktionen' | 'benachrichtigungen';
}

export function VerlaufLayout({ children, activeTab }: Props): React.JSX.Element {
  const [, navigate] = useLocation();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.length ?? 0;

  const VERLAUF_TABS: TabItem[] = [
    { id: 'feed', label: 'Aktivität', href: '/verlauf' },
    { id: 'transaktionen', label: 'Käufe', href: '/verlauf/transaktionen' },
    { id: 'benachrichtigungen', label: 'Nachrichten', href: '/verlauf/benachrichtigungen', badge: unreadCount > 0 ? unreadCount : undefined },
  ];

  const handleTabChange = (id: string): void => {
    const tab = VERLAUF_TABS.find((t) => t.id === id);
    if (tab) navigate(tab.href);
  };

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Tabs items={VERLAUF_TABS} activeId={activeTab} />
        <TabContent activeId={activeTab} items={VERLAUF_TABS} onTabChange={handleTabChange}>
          {children}
        </TabContent>
      </div>
    </Layout>
  );
}
