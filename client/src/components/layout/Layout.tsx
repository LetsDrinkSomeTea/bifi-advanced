import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { PwaInstallBanner } from '../PwaInstallBanner';
import { DevBanner } from '../DevBanner';

interface Props {
  children: React.ReactNode;
}

export function Layout({ children }: Props): React.JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar />
      <DevBanner />
      <PwaInstallBanner />
      <main className="flex-1 overflow-y-auto pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
