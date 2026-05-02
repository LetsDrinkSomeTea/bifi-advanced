import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, X, Users, ChevronRight } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useGroups, useCreateGroup, useJoinGroup } from '../hooks/useGroups';
import { cn } from '../lib/utils';

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate: create, isPending, error } = useCreateGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create(
      { name: name.trim(), description: description.trim() || undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Neue Gruppe</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Gruppenname"
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            maxLength={60}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <input
            type="text"
            placeholder="Beschreibung (optional)"
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
            maxLength={200}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && <p className="text-xs text-destructive">Fehler beim Erstellen</p>}
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            Erstellen
          </button>
        </form>
      </div>
    </div>
  );
}

function JoinGroupModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const { mutate: join, isPending, error } = useJoinGroup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    join(code.trim(), { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Gruppe beitreten</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Einladungscode"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); }}
            maxLength={8}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && (
            <p className="text-xs text-destructive">
              {(error as { message?: string })?.message ?? 'Ungültiger Code'}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending || !code.trim()}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            Beitreten
          </button>
        </form>
      </div>
    </div>
  );
}

export function Groups() {
  const { data: groups, isLoading } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Gruppen</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setJoinOpen(true); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Beitreten
            </button>
            <button
              onClick={() => { setCreateOpen(true); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus size={15} />
              Neu
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && (!groups || groups.length === 0) && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
            <Users size={32} className="mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">Noch keine Gruppen</p>
            <p className="text-xs text-muted-foreground opacity-70">
              Erstelle eine Gruppe oder tritt mit einem Code bei
            </p>
          </div>
        )}

        {groups && groups.length > 0 && (
          <div className="space-y-3">
            {groups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`}>
                <div className="flex items-center gap-3 px-4 py-4 rounded-2xl border border-border bg-card hover:bg-accent transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.memberCount} {g.memberCount === 1 ? 'Mitglied' : 'Mitglieder'}
                      {g.myRole === 'owner' && ' · Eigentümer'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {createOpen && <CreateGroupModal onClose={() => { setCreateOpen(false); }} />}
      {joinOpen && <JoinGroupModal onClose={() => { setJoinOpen(false); }} />}
    </Layout>
  );
}
