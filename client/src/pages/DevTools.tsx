import { useState } from 'react';
import { toast } from 'sonner';
import { Trophy, Bell, Wallet, Trash2, Zap, RefreshCw } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SectionHeader } from '../components/ui/SectionHeader';

const IS_DEV = import.meta.env.VITE_DEV_TOOLS === 'true';

interface ActionButtonProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: () => Promise<void>;
}

function ActionButton({ label, description, icon, variant = 'outline', onClick }: ActionButtonProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  const handle = async (): Promise<void> => {
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-muted-foreground flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button
        variant={variant}
        size="sm"
        onClick={() => { void handle(); }}
        disabled={loading}
        className="flex-shrink-0"
      >
        {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Ausführen'}
      </Button>
    </div>
  );
}

export function DevTools(): React.JSX.Element {
  const qc = useQueryClient();
  const [balanceInput, setBalanceInput] = useState('5000');

  if (!IS_DEV) {
    return (
      <Layout>
        <div className="px-4 py-16 text-center text-muted-foreground text-sm">
          DevTools sind in dieser Umgebung nicht verfügbar.
        </div>
      </Layout>
    );
  }

  const invalidateAll = (): void => {
    void qc.invalidateQueries({ queryKey: ['auth'] });
    void qc.invalidateQueries({ queryKey: ['achievements'] });
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const achievementActions = [
    {
      label: 'Alle Achievements freischalten',
      description: 'Alle Achievement-Keys für diesen Account anlegen',
      icon: <Trophy size={18} />,
      onClick: async () => {
        const res = await api.post<{ unlocked: number }>('/api/dev/achievements/unlock-all', {});
        void qc.invalidateQueries({ queryKey: ['achievements'] });
        toast.success(`${res.unlocked} Achievements freigeschaltet`);
      },
    },
    {
      label: 'Alle Achievements löschen',
      description: 'Alle Achievement-Einträge dieses Accounts entfernen',
      icon: <Trash2 size={18} />,
      variant: 'destructive' as const,
      onClick: async () => {
        await api.post('/api/dev/achievements/clear', {});
        void qc.invalidateQueries({ queryKey: ['achievements'] });
        toast.success('Achievements gelöscht');
      },
    },
  ];

  const notificationActions = [
    {
      label: 'Je eine Benachrichtigung pro Typ',
      description: '7 Test-Notifications erstellen (alle Typen)',
      icon: <Bell size={18} />,
      onClick: async () => {
        await api.post('/api/dev/notifications/seed', {});
        void qc.invalidateQueries({ queryKey: ['notifications'] });
        toast.success('7 Test-Notifications erstellt');
      },
    },
    {
      label: 'Alle Benachrichtigungen löschen',
      description: 'Hard-delete aller Notifications dieses Accounts',
      icon: <Trash2 size={18} />,
      variant: 'destructive' as const,
      onClick: async () => {
        await api.post('/api/dev/notifications/clear', {});
        void qc.invalidateQueries({ queryKey: ['notifications'] });
        toast.success('Notifications gelöscht');
      },
    },
  ];

  return (
    <Layout>
      <div className="px-4 py-5 max-w-lg mx-auto space-y-6">
        <div className="rounded-2xl border border-amber-400/60 bg-amber-400/10 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Diese Seite ist nur im Dev-Mode verfügbar und manipuliert die Datenbank.
          </p>
        </div>

        {/* Achievements */}
        <section>
          <SectionHeader>
            <span className="flex items-center gap-2"><Trophy size={15} /> Achievements</span>
          </SectionHeader>
          <div className="rounded-2xl border border-border bg-card px-4">
            {achievementActions.map((a) => (
              <ActionButton key={a.label} {...a} />
            ))}
          </div>
        </section>

        {/* Benachrichtigungen */}
        <section>
          <SectionHeader>
            <span className="flex items-center gap-2"><Bell size={15} /> Benachrichtigungen</span>
          </SectionHeader>
          <div className="rounded-2xl border border-border bg-card px-4">
            {notificationActions.map((a) => (
              <ActionButton key={a.label} {...a} />
            ))}
          </div>
        </section>

        {/* Guthaben */}
        <section>
          <SectionHeader>
            <span className="flex items-center gap-2"><Wallet size={15} /> Guthaben</span>
          </SectionHeader>
          <div className="rounded-2xl border border-border bg-card px-4">
            <div className="py-3 space-y-3">
              <div>
                <p className="text-sm font-semibold">Guthaben setzen</p>
                <p className="text-xs text-muted-foreground">Wert in Cent (z.B. 5000 = 50,00 €)</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={balanceInput}
                  onChange={(e) => { setBalanceInput(e.target.value); }}
                  className="flex-1 h-9"
                  placeholder="Cent"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    void (async () => {
                      const cents = parseInt(balanceInput, 10);
                      if (isNaN(cents)) { toast.error('Ungültiger Betrag'); return; }
                      await api.post('/api/dev/balance', { cents });
                      void qc.invalidateQueries({ queryKey: ['auth', 'me'] });
                      toast.success(`Guthaben auf ${(cents / 100).toFixed(2)} € gesetzt`);
                    })();
                  }}
                >
                  Setzen
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[0, 500, 5000, 10000, -500].map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    onClick={() => { setBalanceInput(String(v)); }}
                    className="text-xs"
                  >
                    {v >= 0 ? `+${(v / 100).toFixed(0)} €` : `${(v / 100).toFixed(0)} €`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Cache */}
        <section>
          <SectionHeader>
            <span className="flex items-center gap-2"><Zap size={15} /> Sonstiges</span>
          </SectionHeader>
          <div className="rounded-2xl border border-border bg-card px-4">
            <ActionButton
              label="Query-Cache leeren"
              description="Alle React Query Caches invalidieren"
              icon={<RefreshCw size={18} />}
              onClick={() => {
                invalidateAll();
                toast.success('Cache geleert');
                return Promise.resolve();
              }}
            />
          </div>
        </section>
      </div>
    </Layout>
  );
}
