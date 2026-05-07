import { useLocation } from 'wouter';
import { Layout } from '../../components/layout/Layout';
import { Tabs, TabContent, type TabItem } from '../../components/ui/Tabs';

const SOCIAL_TABS: TabItem[] = [
  { id: 'social', label: 'Sozial', href: '/social' },
  { id: 'leaderboard', label: 'Rangliste', href: '/social/leaderboard' },
];

interface Props {
  children: React.ReactNode;
  activeTab: 'social' | 'leaderboard';
}

export function SocialLayout({ children, activeTab }: Props): React.JSX.Element {
  const [, navigate] = useLocation();

  const handleTabChange = (id: string): void => {
    const tab = SOCIAL_TABS.find((t) => t.id === id);
    if (tab) navigate(tab.href);
  };

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Tabs items={SOCIAL_TABS} activeId={activeTab} />
        <TabContent activeId={activeTab} items={SOCIAL_TABS} onTabChange={handleTabChange}>
          {children}
        </TabContent>
      </div>
    </Layout>
  );
}
