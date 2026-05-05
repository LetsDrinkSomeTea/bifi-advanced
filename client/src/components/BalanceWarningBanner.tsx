import React from 'react';
import { AlertOctagon, Wallet } from 'lucide-react';
import { formatCents } from '../lib/utils';

interface BalanceWarningBannerProps {
  balance: number;
  threshold: number;
}

export function BalanceWarningBanner({
  balance,
  threshold,
}: BalanceWarningBannerProps): React.JSX.Element | null {
  if (balance >= threshold) return null;

  return (
    <div className="bg-accent-500 rounded-2xl p-4 text-white flex items-center gap-4 overflow-hidden relative group transition-all">
      <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Wallet size={100} />
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <AlertOctagon size={24} className="animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-black text-lg leading-tight uppercase tracking-tighter italic">
            Kontostand niedrig
          </h3>
        </div>
        <p className="text-sm font-medium opacity-90 truncate">
          Dein Guthaben ist unter {formatCents(threshold)}. Bitte lade dein Konto auf!
        </p>
      </div>
    </div>
  );
}
