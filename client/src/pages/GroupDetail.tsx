import { toast } from 'sonner';
import { useParams, useLocation } from 'wouter';
import { Link } from 'wouter';
import { useRef, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  LogOut,
  Trash2,
  UserX,
  QrCode,
  X,
  LoaderCircle,
  Camera,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import {
  useGroupDetail,
  useLeaveGroup,
  useRemoveMember,
  useDeleteGroup,
  useRefreshInviteCode,
  useUploadGroupImage,
} from '../hooks/useGroups';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

import { useDialog } from '../hooks/useDialog';
import { Button } from '../components/ui/Button';

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

function QRModal({
  code,
  groupName,
  onClose,
}: {
  code: string;
  groupName: string;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 mx-4">
        <div className="flex items-center justify-between w-full">
          <h2 className="font-semibold">{groupName} beitreten</h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X size={18} />
          </Button>
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

export function GroupDetail(): React.JSX.Element {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const dialog = useDialog();
  const { data: group, isLoading } = useGroupDetail(groupId);
  const { mutate: leave, isPending: leaving } = useLeaveGroup();
  const { mutate: remove, isPending: removing } = useRemoveMember();
  const { mutate: deleteGroup, isPending: deleting } = useDeleteGroup();
  const { mutate: refreshCode } = useRefreshInviteCode();
  const { mutate: uploadImage, isPending: uploadingImage } = useUploadGroupImage(groupId);
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (): void => {
    if (!group?.inviteCode) return;
    void copyToClipboard(group.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Datei zu groß (max 2 MB)');
      return;
    }
    uploadImage(file, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
      },
    });
    e.target.value = '';
  };

  return (
    <Layout>
      <div className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Header: back + image + name */}
        <div>
          <button
            type="button"
            onClick={() => {
              navigate('/social');
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 -ml-1 transition-colors"
          >
            <ArrowLeft size={16} />
            Zurück
          </button>
          <div className="flex items-center gap-4">
            <div className="relative size-16 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
              {group.imageUrl !== null ? (
                <img src={group.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold">{group.name[0]?.toUpperCase()}</span>
              )}
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => {
                    imageInputRef.current?.click();
                  }}
                  disabled={uploadingImage}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                  title="Gruppenbild ändern"
                >
                  {uploadingImage ? (
                    <LoaderCircle size={18} className="animate-spin text-white" />
                  ) : (
                    <Camera size={18} className="text-white" />
                  )}
                </button>
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{group.name}</h1>
              {group.description ? (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {group.description}
                </p>
              ) : null}
            </div>
          </div>
          {isOwner ? (
            <>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageChange}
              />
            </>
          ) : null}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className={cn('transition-colors', copied && 'text-confirm')}
              title={copied ? 'Kopiert!' : 'Kopieren'}
            >
              <Copy size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setQrOpen(true);
              }}
              title="QR-Code anzeigen"
            >
              <QrCode size={18} />
            </Button>
            {isOwner ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  refreshCode(group.id);
                }}
                title="Neuen Code generieren"
              >
                <RefreshCw size={18} />
              </Button>
            ) : null}
          </div>
          {copied ? <p className="text-xs text-confirm">Code kopiert!</p> : null}
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
                {isOwner && m.id !== user?.id ? (
                  <Button
                    size="icon"
                    onClick={() => {
                      remove({ groupId: group.id, userId: m.id });
                    }}
                    variant="ghost_destructive"
                    className="h-8 w-8 rounded-lg"
                    title="Ablehnen"
                  >
                    {removing ? <LoaderCircle size={16} /> : <UserX size={16} />}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="space-y-2 pb-4">
          <Button
            variant="ghost_destructive"
            onClick={() => {
              void (async () => {
                if (
                  await dialog.confirmDelete(
                    'Gruppe verlassen',
                    `Gruppe "${group.name}" wirklich verlassen?`,
                  )
                ) {
                  leave(group.id, {
                    onSuccess: () => {
                      navigate('/social');
                    },
                  });
                }
              })();
            }}
            disabled={leaving}
            className="w-full justify-start h-9"
          >
            <LogOut size={15} />
            Gruppe verlassen
          </Button>

          {isOwner ? (
            <Button
              variant="ghost_destructive"
              onClick={() => {
                void (async () => {
                  if (
                    await dialog.confirmDelete(
                      'Gruppe löschen',
                      `Gruppe „${group.name}" wirklich löschen?`,
                    )
                  ) {
                    deleteGroup(group.id, {
                      onSuccess: () => {
                        navigate('/social');
                      },
                    });
                  }
                })();
              }}
              disabled={deleting}
              className="w-full justify-start h-9"
            >
              <Trash2 size={15} />
              Gruppe löschen
            </Button>
          ) : null}
        </div>
      </div>

      {qrOpen && group.inviteCode ? (
        <QRModal
          code={group.inviteCode}
          groupName={group.name}
          onClose={() => {
            setQrOpen(false);
          }}
        />
      ) : null}
    </Layout>
  );
}
