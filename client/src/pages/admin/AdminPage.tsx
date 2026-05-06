import { useParams } from 'wouter';
import { AdminLayout } from './AdminLayout';
import { AdminUsersContent } from './Users';
import { AdminProductsContent } from './Products';
import { AdminPromotionsContent } from './Promotions';
import { AdminSettlementContent } from './Settlement';
import { AdminAuditLogContent } from './AuditLog';

type AdminPageType = 'users' | 'products' | 'promotions' | 'settlement' | 'audit-log';

export function AdminPage(): React.JSX.Element {
  const { page } = useParams<{ page?: AdminPageType }>();
  const activePage = page ?? 'users';

  return (
    <AdminLayout>
      {activePage === 'users' && <AdminUsersContent />}
      {activePage === 'products' && <AdminProductsContent />}
      {activePage === 'promotions' && <AdminPromotionsContent />}
      {activePage === 'settlement' && <AdminSettlementContent />}
      {activePage === 'audit-log' && <AdminAuditLogContent />}
    </AdminLayout>
  );
}
