import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Award,
  BarChart2,
  Beer,
  Bell,
  Clock,
  Dices,
  Gift,
  Hand,
  Home,
  Lock,
  Receipt,
  ScrollText,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Trophy,
  Undo2,
  Upload,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { User } from '@shared/types';
import { useAuth, useAuthConfig, type AuthConfig } from '../hooks/useAuth';
import { useCompleteOnboarding, useOnboardingReplay } from '../hooks/useOnboarding';
import { useUpdateProfile, useUploadAvatar } from '../hooks/useProfile';
import { isStandalone } from '../hooks/usePwaInstall';
import { ROLE_LABEL } from '../lib/constants';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

// ─── Slide content ────────────────────────────────────────────────────────────

type Tone = 'primary' | 'accent' | 'confirm' | 'secondary';

const TONE_STYLE: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-strong',
  accent: 'bg-accent-soft text-accent-strong',
  confirm: 'bg-confirm-soft text-confirm-strong',
  secondary: 'bg-secondary-soft text-secondary-strong',
};

interface Point {
  icon: LucideIcon;
  text: React.ReactNode;
}

interface Slide {
  id: string;
  icon: LucideIcon;
  tone: Tone;
  title: string;
  body: React.ReactNode;
  points?: Point[];
  note?: { icon: LucideIcon; tone: Tone; text: React.ReactNode };
  badge?: string;
}

function tourVariant(user: User): User['onboardingVariant'] {
  return user.onboardingCompletedAt === null ? user.onboardingVariant : 'returning';
}

function buildSlides(user: User, config: AuthConfig | undefined): Slide[] {
  const isModerator = user.role === 'admin' || user.role === 'moderator';
  // Existing members, and anyone replaying it after finishing, skip the basics and get a
  // tour of what they might have missed.
  const isReturning = tourVariant(user) === 'returning';
  const slides: Slide[] = [];

  if (isReturning) {
    slides.push({
      id: 'welcome',
      icon: Sparkles,
      tone: 'accent',
      title: 'Schön, dass du da bist!',
      body: 'Du kennst dich ja schon aus. Aber weißt du auch, was alles möglich ist? Hier ein paar Funktionen, die du vielleicht noch nicht entdeckt hast.',
    });
  } else {
    slides.push(
      {
        id: 'welcome',
        icon: Beer,
        tone: 'accent',
        title: 'Willkommen bei BiFi',
        body: 'Eure digitale Strichliste. In einer Minute zeigen wir dir, wie alles funktioniert.',
      },
      {
        id: 'balance',
        icon: Wallet,
        tone: 'confirm',
        title: 'Dein Guthaben',
        body: 'Oben rechts siehst du immer deinen Kontostand. Jeder Kauf wird direkt davon abgezogen.',
        points: [
          {
            icon: Wallet,
            text: 'Zum Aufladen bezahlst du bar oder per Überweisung, ein Moderator oder Admin bucht es dir ein.',
          },
          {
            icon: Bell,
            text: 'Rutschst du zu weit ins Minus, erinnert dich ein Banner ans Aufladen.',
          },
        ],
      },
    );
  }

  slides.push(
    {
      id: 'home',
      icon: Home,
      tone: 'primary',
      title: 'Home & Favoriten',
      body: 'Auf Home buchst du deine Lieblingsgetränke mit einem Tipp.',
      points: [
        { icon: Star, text: 'Markiere Produkte im Shop mit dem Stern, dann landen sie hier.' },
        { icon: Sparkles, text: 'Darunter siehst du, was gerade bei den anderen los ist.' },
      ],
    },
    {
      id: 'shop',
      icon: ShoppingBag,
      tone: 'primary',
      title: 'Shop & Kaufen',
      body: 'Produkt antippen, Variante und Menge wählen, bestätigen. Fertig.',
      points: [
        { icon: Tag, text: 'Aktive Rabattaktionen erscheinen als Banner im Shop.' },
        {
          icon: Undo2,
          text: (
            <>
              Vertippt? Unter <b>Verlauf → Käufe</b> kannst du 5 Minuten lang stornieren.
            </>
          ),
        },
      ],
    },
    {
      id: 'social',
      icon: Users,
      tone: 'secondary',
      title: 'Freunde & Gruppen',
      body: (
        <>
          Unter <b>Sozial</b> findest du Freunde, Gruppen und die Rangliste.
        </>
      ),
      points: [
        { icon: Search, text: 'Such nach Leuten und schick ihnen eine Freundschaftsanfrage.' },
        {
          icon: Users,
          text: 'Kauft ihr als Gruppe, wird der Betrag gleichmäßig auf alle Mitglieder aufgeteilt.',
        },
        { icon: Trophy, text: 'Die Rangliste vergleicht euch nach Woche, Monat oder insgesamt.' },
      ],
    },
    {
      id: 'prost',
      icon: Gift,
      tone: 'accent',
      title: 'Prost & Anstupsen',
      body: 'Auf dem Profil einer Person kannst du ihr etwas Gutes tun.',
      points: [
        {
          icon: Beer,
          text: (
            <>
              <b>Prost:</b> Spendier ein Getränk. Sie bekommt einen Gutschein, der beim nächsten
              Kauf automatisch eingelöst wird.
            </>
          ),
        },
        {
          icon: Hand,
          text: (
            <>
              <b>Anstupsen:</b> Schick eine kurze Nachricht, z.B. eine Einladung auf ein Bier.
            </>
          ),
        },
      ],
    },
  );

  if (config?.transfersEnabled) {
    slides.push({
      id: 'transfer',
      icon: Send,
      tone: 'confirm',
      title: 'Geld senden',
      // Only new to members from before the feature, not to someone replaying the tour.
      badge: user.onboardingVariant === 'returning' ? 'Neu' : undefined,
      body: 'Hat dir jemand die Pizza ausgelegt? Über das Senden-Symbol im Profil überweist du Guthaben sofort.',
      points: [
        { icon: Lock, text: 'Betrag und Verwendungszweck seht nur ihr beide.' },
        { icon: Undo2, text: 'Du kannst die Überweisung 5 Minuten lang im Verlauf stornieren.' },
      ],
    });
  }

  if (config?.jackpotEnabled) {
    slides.push({
      id: 'jackpot',
      icon: Dices,
      tone: 'accent',
      title: 'Jackpot',
      body: 'Statt normal zu kaufen, kannst du am Glücksrad drehen: Du zahlst zufällig zwischen 0 % und 200 % des Preises, im Schnitt genau den Normalpreis.',
      points: [{ icon: Undo2, text: 'Jackpot-Drehs lassen sich nicht stornieren.' }],
      note: user.jackpotAllowed
        ? { icon: ShieldCheck, tone: 'confirm', text: 'Für dich ist der Jackpot freigeschaltet.' }
        : {
            icon: Lock,
            tone: 'accent',
            text: 'Für dich ist der Jackpot noch nicht aktiviert, neue Mitglieder haben ihn standardmäßig aus. Frag einen Moderator oder Admin, wenn du mitdrehen willst.',
          },
    });
  }

  slides.push(
    {
      id: 'verlauf',
      icon: Clock,
      tone: 'primary',
      title: 'Verlauf',
      body: 'Hier läuft alles zusammen.',
      points: [
        { icon: Sparkles, text: 'Aktivität: was bei deinen Freunden passiert.' },
        { icon: Receipt, text: 'Käufe: deine Buchungen und Stornos.' },
        {
          icon: Bell,
          text: 'Nachrichten: Prost, Stupser, Rabatte und mehr, auch über die Glocke oben.',
        },
      ],
    },
    {
      id: 'achievements',
      icon: Award,
      tone: 'secondary',
      title: 'Achievements & Statistiken',
      body: 'Für Meilensteine gibt es Trophäen. Sie erscheinen in deinem Profil und im Feed.',
      points: [
        {
          icon: BarChart2,
          text: 'In den Statistiken siehst du deine Ausgaben, Lieblingsprodukte und wann du am meisten trinkst.',
        },
      ],
    },
  );

  if (isModerator) {
    const points: Point[] = [
      { icon: Users, text: 'Nutzer anlegen, Guthaben einzahlen, Jackpot freischalten' },
      { icon: ShoppingBag, text: 'Produkte und Rabattaktionen pflegen' },
      { icon: Wallet, text: 'Schuldenliste und Zahlungserinnerungen' },
    ];
    if (user.role === 'admin') {
      points.push({ icon: ScrollText, text: 'Rollen vergeben und das Audit-Log einsehen' });
    }
    slides.push({
      id: 'admin',
      icon: ShieldCheck,
      tone: 'secondary',
      title: 'Admin-Bereich',
      body: `Als ${ROLE_LABEL[user.role]} erreichst du die Verwaltung über deinen Avatar oben rechts.`,
      points,
    });
  }

  if (!isStandalone()) {
    slides.push({
      id: 'install',
      icon: Smartphone,
      tone: 'primary',
      title: 'Als App installieren',
      body: 'Leg BiFi auf deinen Startbildschirm, dann ist es nur einen Tipp entfernt.',
      points: [
        {
          icon: Smartphone,
          text: (
            <>
              <b>iPhone (Safari):</b> Teilen-Symbol → „Zum Home-Bildschirm“
            </>
          ),
        },
        {
          icon: Smartphone,
          text: (
            <>
              <b>Android (Chrome):</b> Menü ⋮ → „App installieren“
            </>
          ),
        },
      ],
    });
  }

  return slides;
}

// ─── Slide views ──────────────────────────────────────────────────────────────

function SlideIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }): React.JSX.Element {
  return (
    <div
      className={cn(
        'mx-auto mb-6 flex size-24 items-center justify-center rounded-3xl',
        TONE_STYLE[tone],
      )}
    >
      <Icon size={44} strokeWidth={1.75} />
    </div>
  );
}

function InfoSlide({ slide }: { slide: Slide }): React.JSX.Element {
  return (
    <div>
      <SlideIcon icon={slide.icon} tone={slide.tone} />
      {slide.badge ? (
        <p className="mb-2 text-center">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {slide.badge}
          </span>
        </p>
      ) : null}
      <h2 id="onboarding-title" className="text-2xl font-bold text-center text-balance">
        {slide.title}
      </h2>
      <p className="mt-3 text-center text-muted-foreground text-pretty">{slide.body}</p>
      {slide.points ? (
        <ul className="mt-6 space-y-3">
          {slide.points.map(({ icon: Icon, text }, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            >
              <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {slide.note ? (
        <div
          className={cn(
            'mt-4 flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm',
            TONE_STYLE[slide.note.tone],
          )}
        >
          <slide.note.icon size={16} className="mt-0.5 shrink-0" />
          <span>{slide.note.text}</span>
        </div>
      ) : null}
    </div>
  );
}

function ProfileSetupSlide({
  user,
  preview,
  onFile,
  displayName,
  onDisplayName,
}: {
  user: User;
  preview: string | null;
  onFile: (file: File) => void;
  displayName: string;
  onDisplayName: (name: string) => void;
}): React.JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const avatar = preview ?? user.avatarUrl;
  const canEditName = !user.hasSsoLinked;

  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="group relative mx-auto mb-6 flex size-24 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary-strong"
        aria-label="Profilbild wählen"
      >
        {avatar ? (
          <img src={avatar} alt="" className="size-full object-cover" />
        ) : (
          <UserCircle size={44} strokeWidth={1.75} />
        )}
        <span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 py-1 text-white">
          <Upload size={14} />
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 2 * 1024 * 1024) {
            toast.error('Datei zu groß (max 2 MB)');
            return;
          }
          onFile(file);
        }}
      />
      <h2 id="onboarding-title" className="text-2xl font-bold text-center">
        Zeig dich!
      </h2>
      <p className="mt-3 text-center text-muted-foreground text-pretty">
        Mit Profilbild erkennen dich deine Freunde im Feed und in der Rangliste. Du kannst das auch
        später im Profil ändern.
      </p>
      {canEditName ? (
        <div className="mt-6">
          <label htmlFor="onboarding-name" className="mb-1 block text-sm font-medium">
            Anzeigename
          </label>
          <Input
            id="onboarding-name"
            value={displayName}
            maxLength={80}
            onChange={(e) => onDisplayName(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

// ─── Overlay ──────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;

export function Onboarding(): React.JSX.Element | null {
  const { user } = useAuth();
  const { isReplay, closeReplay } = useOnboardingReplay();
  const open = !!user && (isReplay || user.onboardingCompletedAt === null);

  // Fresh state on every open, e.g. when replaying from the profile.
  return open ? <OnboardingDialog user={user} isReplay={isReplay} onClose={closeReplay} /> : null;
}

function OnboardingDialog({
  user,
  isReplay,
  onClose,
}: {
  user: User;
  isReplay: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { data: config } = useAuthConfig();
  const { mutate: complete } = useCompleteOnboarding();
  const { mutateAsync: uploadAvatar } = useUploadAvatar();
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(() => buildSlides(user, config), [user, config]);
  // Returning members who already have an avatar don't need the profile setup.
  const showProfileSetup = tourVariant(user) === 'new' || !user.avatarUrl;
  const total = slides.length + (showProfileSetup ? 1 : 0);
  const [[index, direction], setPage] = useState<[number, number]>([0, 0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [saving, setSaving] = useState(false);

  const isLast = index === total - 1;
  const slide = slides[index];

  const go = (next: number): void => {
    if (next < 0 || next >= total) return;
    setPage([next, next > index ? 1 : -1]);
  };

  const close = (skipped = false): void => {
    if (user.onboardingCompletedAt === null) complete();
    if (isReplay) onClose();
    else if (skipped) {
      toast.info(
        'Du findest die Einführung jederzeit im Menü hinter deinem Profilbild oben rechts.',
        {
          duration: 8000,
        },
      );
    }
  };

  const finish = async (): Promise<void> => {
    const name = displayName.trim();
    setSaving(true);
    try {
      if (file) await uploadAvatar(file);
      if (!user.hasSsoLinked && name !== '' && name !== user.displayName) {
        await updateProfile({ displayName: name });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
      setSaving(false);
      return;
    }
    close();
  };

  useEffect(() => {
    dialogRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };

  const offset = reduceMotion ? 0 : 48;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-60 flex flex-col bg-background outline-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {index + 1} / {total}
        </span>
        {!isLast ? (
          <Button variant="ghost" size="sm" onClick={() => close(true)}>
            Überspringen
          </Button>
        ) : (
          <span className="h-9" />
        )}
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-6">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            initial={{ x: direction * offset, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -direction * offset, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag={slide ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) go(index + 1);
              else if (info.offset.x > SWIPE_THRESHOLD) go(index - 1);
            }}
            className="w-full max-w-sm touch-pan-y"
          >
            {slide ? (
              <InfoSlide slide={slide} />
            ) : (
              <ProfileSetupSlide
                user={user}
                preview={preview}
                onFile={(f) => {
                  setFile(f);
                  setPreview(URL.createObjectURL(f));
                }}
                displayName={displayName}
                onDisplayName={setDisplayName}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mx-auto w-full max-w-sm px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <div className="mb-5 flex justify-center gap-1.5" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
        <div className="flex gap-3">
          {index > 0 ? (
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => go(index - 1)}
              disabled={saving}
            >
              Zurück
            </Button>
          ) : null}
          {isLast ? (
            <Button className="flex-1 rounded-xl" onClick={() => void finish()} disabled={saving}>
              {saving ? 'Speichern…' : 'Los geht’s'}
            </Button>
          ) : (
            <Button className="flex-1 rounded-xl" onClick={() => go(index + 1)}>
              Weiter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
