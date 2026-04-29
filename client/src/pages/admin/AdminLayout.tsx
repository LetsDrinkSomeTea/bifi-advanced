import { Link, useLocation } from 'wouter'
import { Layout } from '../../components/layout/Layout'
import { cn } from '../../lib/utils'

const TABS = [
  { href: '/admin/users', label: 'Nutzer' },
  { href: '/admin/products', label: 'Produkte' },
  { href: '/admin/settlement', label: 'Schulden' },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  return (
    <Layout>
      <div className="border-b border-border sticky top-0 bg-background z-10">
        <div className="flex px-2 max-w-lg mx-auto">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                location.startsWith(tab.href)
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="px-4 py-4 max-w-lg mx-auto">{children}</div>
    </Layout>
  )
}
