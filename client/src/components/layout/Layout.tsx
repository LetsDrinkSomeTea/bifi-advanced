import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 pb-16 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
