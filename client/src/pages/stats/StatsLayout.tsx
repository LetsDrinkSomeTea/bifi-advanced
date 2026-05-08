import { useLocation } from 'wouter';
import { Layout } from '../../components/layout/Layout';
import { Tabs, TabContent, type TabItem } from '../../components/ui/Tabs';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { usePublicProfile } from '../../hooks/useProfile';

interface Props {
  children: React.ReactNode;
  activeTab: 'personal' | 'system';
  userId?: string;
}

export function StatsLayout({ children, activeTab, userId }: Props): React.JSX.Element {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();

  const targetId = userId === 'stats' ? currentUser?.id : (userId ?? currentUser?.id);
  const isOwn = userId === undefined || userId === 'stats' || userId === currentUser?.id;

  const { data: profile } = usePublicProfile(targetId);

  const handleBack = (): void => {
    if (isOwn) {
      navigate('/profile');
    } else if (targetId !== undefined) {
      navigate(`/profile/${targetId}`);
    }
  };

  const STATS_TABS: TabItem[] = [
    { id: 'personal', label: 'Persönlich', href: isOwn ? '/stats' : `/stats/${targetId}` },
    { id: 'system', label: 'System', href: isOwn ? '/stats/system' : `/stats/${targetId}/system` },
  ];

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto pb-20">
        <PageHeader
          title="Statistiken"
          subtitle={
            isOwn ? 'Deine Auswertungen' : `Statistiken von ${profile?.displayName ?? '...'}`
          }
          onBack={handleBack}
        />

        <div className="space-y-4">
          {isOwn ? <Tabs items={STATS_TABS} activeId={activeTab} /> : null}
          <TabContent
            activeId={activeTab}
            items={STATS_TABS}
            onTabChange={(id) => {
              const tab = STATS_TABS.find((t) => t.id === id);
              if (tab) navigate(tab.href);
            }}
          >
            {children}
          </TabContent>
        </div>
      </div>
    </Layout>
  );
}
