import { TriangleAlert } from 'lucide-react';
import { Link } from 'wouter';

const IS_DEV = import.meta.env.VITE_DEV_TOOLS === 'true';

export function DevBanner(): React.JSX.Element | null {
  if (!IS_DEV) return null;

  return (
    <div className="sticky top-14 z-10 flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-400/90 text-amber-950 text-xs font-semibold backdrop-blur-sm">
      <TriangleAlert size={13} className="flex-shrink-0" />
      <span>DEV MODE — nicht produktiv verwenden</span>
      <Link href="/dev" className="underline underline-offset-2 hover:opacity-70 transition-opacity">
        DevTools
      </Link>
    </div>
  );
}
