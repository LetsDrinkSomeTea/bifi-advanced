import { useParams, useLocation } from 'wouter';
import { Link } from 'wouter';
import { useState } from 'react';
import { Copy, RefreshCw, LogOut, Trash2, UserX, QrCode, X } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import {
  useGroupDetail,
  useLeaveGroup,
  useRemoveMember,
  useDeleteGroup,
  useRefreshInviteCode,
} from '../hooks/useGroups';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for non-HTTPS / older browsers
  return new Promise((resolve) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    resolve();
  });
}

function QRModal({
  code,
  groupName,
  onClose,
}: {
  code: string;
  groupName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 mx-4">
        <div className="flex items-center justify-between w-full">
          <h2 className="font-semibold">{groupName} beitreten</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="bg-white p-4 rounded-xl">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/join/${code}`)}&margin=0`}
            alt="QR Code"
            width={200}
            height={200}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          QR-Code scannen oder Code eingeben:
        </p>
        <span className="font-mono font-bold text-2xl tracking-widest px-4 py-2 bg-muted rounded-xl">
          {code}
        </span>
      </div>
    </div>
  );
}

export function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const { data: group, isLoading } = useGroupDetail(groupId);
  const { mutate: leave, isPending: leaving } = useLeaveGroup();
  const { mutate: remove, isPending: removing } = useRemoveMember();
  const { mutate: deleteGroup, isPending: deleting } = useDeleteGroup();
  const { mutate: refreshCode } = useRefreshInviteCode();
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleCopy = () => {
    if (!group?.inviteCode) return;
    copyToClipboard(group.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 2000);
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-24 rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
          Gruppe nicht gefunden
        </div>
      </Layout>
    );
  }

  const isOwner = group.myRole === 'owner';

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
          )}
        </div>

        {/* Invite code */}
        <div className="rounded-2xl border border-border bg-card px-4 py-4 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Einladungscode
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-2xl tracking-widest flex-1 select-all">
              {group.inviteCode}
            </span>
            <button
              onClick={handleCopy}
              className={cn(
                'p-2 rounded-lg transition-colors',
                copied
                  ? 'text-green-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
              title={copied ? 'Kopiert!' : 'Kopieren'}
            >
              <Copy size={18} />
            </button>
            <button
              onClick={() => { setQrOpen(true); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="QR-Code anzeigen"
            >
              <QrCode size={18} />
            </button>
            {isOwner && (
              <button
                onClick={() => { refreshCode(group.id); }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Neuen Code generieren"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>
          {copied && <p className="text-xs text-green-500">Code kopiert!</p>}
        </div>

        {/* Members */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Mitglieder ({group.members.length})
          </h2>
          <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 bg-card">
                <Link href={`/profile/${m.id}`}>
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0 cursor-pointer">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{m.displayName[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${m.id}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {m.displayName}
                    {m.id === user?.id && (
                      <span className="text-muted-foreground font-normal"> (du)</span>
                    )}
                  </Link>
                  {m.role === 'owner' && <span className="text-xs text-primary">Eigentümer</span>}
                </div>
                {isOwner && m.id !== user?.id && (
                  <button
                    onClick={() => { remove({ groupId: group.id, userId: m.id }); }}
                    disabled={removing}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    title="Entfernen"
                  >
                    <UserX size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="space-y-2 pb-4">
          <button
            onClick={() => { leave(group.id, { onSuccess: () => { navigate('/social'); } }); }}
            disabled={leaving}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-1 disabled:opacity-50"
          >
            <LogOut size={15} />
            Gruppe verlassen
          </button>

          {isOwner && (
            <button
              onClick={() => {
                if (confirm(`Gruppe „${group.name}" wirklich löschen?`)) {
                  deleteGroup(group.id, { onSuccess: () => { navigate('/social'); } });
                }
              }}
              disabled={deleting}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors py-1 disabled:opacity-50"
            >
              <Trash2 size={15} />
              Gruppe löschen
            </button>
          )}
        </div>
      </div>

      {qrOpen && group.inviteCode && (
        <QRModal code={group.inviteCode} groupName={group.name} onClose={() => { setQrOpen(false); }} />
      )}
    </Layout>
  );
}
