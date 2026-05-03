import { useLocation } from 'wouter';
import { Layout } from '../../components/layout/Layout';
import { Tabs, TabContent, type TabItem } from '../../components/ui/Tabs';

const ADMIN_TABS: TabItem[] = [
  { id: 'users', label: 'Nutzer', href: '/admin/users' },
  { id: 'products', label: 'Produkte', href: '/admin/products' },
  { id: 'promotions', label: 'Rabatte', href: '/admin/promotions' },
  { id: 'settlement', label: 'Schulden', href: '/admin/settlement' },
];

export function AdminLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [location, navigate] = useLocation();

  const activeTab = ADMIN_TABS.find((tab) => location.startsWith(tab.href))?.id ?? 'users';

  const handleTabChange = (id: string): void => {
    const tab = ADMIN_TABS.find((t) => t.id === id);
    if (tab) navigate(tab.href);
  };

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Tabs items={ADMIN_TABS} activeId={activeTab} />
        <TabContent activeId={activeTab} items={ADMIN_TABS} onTabChange={handleTabChange}>
          {children}
        </TabContent>
      </div>
    </Layout>
  );
}
