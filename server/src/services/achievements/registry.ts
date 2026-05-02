import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { users, transactions } from '../../db/schema.ts';
import {
  type AchievementDef,
  type AchievementEvent,
  type AchievementEventType,
  type AchievementTier,
} from '../../../../shared/src/achievements.ts';
import {
  categoryItemCount,
  discountedItemCount,
  donationCount,
  getLocalHour,
  getLocalMinute,
  getLocalSecond,
  getLocalWeekday,
  getBiFiDay,
  getISOWeek,
  globalPurchaseCount,
  isAllSevens,
  jackpotLossCount,
  jackpotPlayCount,
  jackpotWinCount,
  prostReceivedCount,
  prostSentCount,
  purchaseCount,
  purchasesOnBiFiDay,
  toLocalTime,
  totalSavedCents,
  unlockedAchievementCount,
} from '../achievements.ts';

// ─── Registry Types ──────────────────────────────────────────────────────────

export interface ServerAchievementDef extends AchievementDef {
  events: AchievementEventType[];
  check: (event: AchievementEvent) => Promise<boolean | number> | boolean | number;
  progress?: (userId: string) => Promise<number> | number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Helper to define a tiered achievement (Bronze, Silver, Gold).
 * The 'check' or 'progress' function should return a numeric value.
 */
function defineTieredAchievement(config: {
  groupKey: string;
  name: string;
  icon: string;
  events: AchievementEventType[];
  hidden?: boolean;
  progressFormat?: 'count' | 'cents';
  tiers: Array<{
    tier: AchievementTier;
    description: string;
    threshold: number;
    hidden?: boolean;
  }>;
  check?: (event: AchievementEvent) => Promise<number> | number;
  progress?: (userId: string) => Promise<number> | number;
}): ServerAchievementDef[] {
  return config.tiers.map((t) => ({
    key: `${config.groupKey}_${t.tier}`,
    name: config.name,
    description: t.description,
    icon: config.icon,
    tier: t.tier,
    groupKey: config.groupKey,
    threshold: t.threshold,
    progressFormat: config.progressFormat,
    hidden: t.hidden ?? config.hidden,
    events: config.events,
    progress: config.progress,
    check: async (event) => {
      const value = config.check
        ? await config.check(event)
        : config.progress
          ? await config.progress(event.userId)
          : 0;
      return value >= t.threshold;
    },
  }));
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const ACHIEVEMENT_REGISTRY: ServerAchievementDef[] = [
  // ── Käufe (tiered) ─────────────────────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'purchases',
    name: 'Stammkunde',
    icon: '🛒',
    events: ['purchase'],
    progress: (userId) => purchaseCount(userId),
    tiers: [
      { tier: 'bronze', description: '1 Kauf getätigt', threshold: 1 },
      { tier: 'silver', description: '10 Käufe getätigt', threshold: 10 },
      { tier: 'gold', description: '100 Käufe getätigt', threshold: 100 },
    ],
  }),

  // ── Prost gesendet (tiered) ────────────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'prost_sent',
    name: 'Großzügig',
    icon: '🥂',
    events: ['prost_sent'],
    progress: (userId) => prostSentCount(userId),
    tiers: [
      { tier: 'bronze', description: '5× Prost gesendet', threshold: 5 },
      { tier: 'silver', description: '15× Prost gesendet', threshold: 15 },
      { tier: 'gold', description: '30× Prost gesendet', threshold: 30 },
    ],
  }),

  // ── Prost erhalten (tiered) ────────────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'prost_received',
    name: 'Beliebt',
    icon: '❤️',
    events: ['prost_received'],
    progress: (userId) => prostReceivedCount(userId),
    tiers: [
      { tier: 'bronze', description: '10× Prost erhalten', threshold: 10 },
      { tier: 'silver', description: '25× Prost erhalten', threshold: 25 },
      { tier: 'gold', description: '50× Prost erhalten', threshold: 50 },
    ],
  }),

  // ── Spenden (tiered, hidden) ───────────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'donations',
    name: 'Spendenritter',
    icon: '🦸',
    events: ['contribution'],
    hidden: true,
    progress: (userId) => donationCount(userId),
    tiers: [
      { tier: 'bronze', description: '3× zum Ziel beigetragen', threshold: 3 },
      {
        tier: 'silver',
        description: '10× zum Ziel beigetragen',
        threshold: 10,
      },
      { tier: 'gold', description: '25× zum Ziel beigetragen', threshold: 25 },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'achievements_collected',
    name: 'Erfolgsjäger',
    icon: '🏆',
    events: [], // Internal trigger
    progress: (userId) => unlockedAchievementCount(userId),
    tiers: [
      {
        tier: 'bronze',
        description: '10 Achievements gesammelt',
        threshold: 10,
      },
      {
        tier: 'silver',
        description: '25 Achievements gesammelt',
        threshold: 25,
      },
      { tier: 'gold', description: '50 Achievements gesammelt', threshold: 50 },
    ],
  }),

  // ── Kategorie-Tränke ───────────────────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'alcoholic_drinker',
    name: 'Hopfenheld',
    icon: '🍺',
    events: ['purchase'],
    progress: (userId) => categoryItemCount(userId, 'alcoholic'),
    tiers: [
      {
        tier: 'bronze',
        description: '25 alkoholische Getränke',
        threshold: 25,
      },
      {
        tier: 'silver',
        description: '100 alkoholische Getränke',
        threshold: 100,
      },
      {
        tier: 'gold',
        description: '500 alkoholische Getränke — Legende im Krug',
        threshold: 500,
      },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'softdrink_lover',
    name: 'Zuckerschock',
    icon: '🥤',
    events: ['purchase'],
    progress: (userId) => categoryItemCount(userId, 'soft_drink'),
    tiers: [
      { tier: 'bronze', description: '25 Softdrinks', threshold: 25 },
      { tier: 'silver', description: '100 Softdrinks', threshold: 100 },
      {
        tier: 'gold',
        description: 'Limo-Legende: 500 Softdrinks',
        threshold: 500,
      },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'food_fan',
    name: 'Schlemmerchampion',
    icon: '🍔',
    events: ['purchase'],
    progress: (userId) => categoryItemCount(userId, 'food'),
    tiers: [
      { tier: 'bronze', description: '25 Speisen', threshold: 25 },
      { tier: 'silver', description: '100 Speisen', threshold: 100 },
      {
        tier: 'gold',
        description: 'Teller-Titan: 500 Speisen',
        threshold: 500,
      },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'snack_king',
    name: 'Snack-König',
    icon: '🍿',
    events: ['purchase'],
    progress: (userId) => categoryItemCount(userId, 'snack'),
    tiers: [
      { tier: 'bronze', description: '25 Snacks', threshold: 25 },
      { tier: 'silver', description: '100 Snacks', threshold: 100 },
      {
        tier: 'gold',
        description: 'Knusper-Kaiser: 500 Snacks',
        threshold: 500,
      },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'misc_collector',
    name: 'Sammler',
    icon: '📦',
    events: ['purchase'],
    progress: (userId) => categoryItemCount(userId, 'other'),
    tiers: [
      { tier: 'bronze', description: '25 sonstige Artikel', threshold: 25 },
      { tier: 'silver', description: '100 sonstige Artikel', threshold: 100 },
      {
        tier: 'gold',
        description: 'Kuriositäten-König: 500 sonstige Artikel',
        threshold: 500,
      },
    ],
  }),

  // ── Balance-related ────────────────────────────────────────────────────────
  {
    key: 'pleite',
    name: 'Pleite',
    description: 'Kontostand fiel unter -10 €',
    icon: '💸',
    hidden: true,
    events: ['purchase', 'deposit'],
    check: async (e) => {
      const [user] = await db
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, e.userId));
      return !!user && user.balance < -1000;
    },
  },
  {
    key: 'tief_verschuldet',
    name: 'Tief verschuldet',
    description: 'Kontostand fiel unter -20 €',
    icon: '🕳️',
    hidden: true,
    events: ['purchase', 'deposit'],
    check: async (e) => {
      const [user] = await db
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, e.userId));
      return !!user && user.balance < -2000;
    },
  },
  {
    key: 'verantwortungsvoll',
    name: 'Verantwortungsvoll',
    description: 'Einen positiven Kontostand gehalten',
    icon: '💚',
    events: ['deposit'],
    check: (e) => e.type === 'deposit' && e.balanceAfter > 0,
  },
  {
    key: 'passendes_kleingeld',
    name: 'Passendes Kleingeld',
    description: 'Exakten Betrag eingezahlt, um auf Null zu kommen',
    icon: '🪙',
    hidden: true,
    events: ['deposit'],
    check: (e) => e.type === 'deposit' && e.balanceBefore < 0 && e.balanceBefore + e.amount === 0,
  },
  {
    key: 'grosse_einzahlung',
    name: 'Große Einzahlung',
    description: 'Einzahlung von 50 € oder mehr',
    icon: '💰',
    events: ['deposit'],
    check: (e) => e.type === 'deposit' && e.amount >= 5000,
  },
  {
    key: 'finanz_phoenix',
    name: 'Finanz-Phönix',
    description: 'Von unter -20 € auf über 20 € in einer Einzahlung',
    icon: '🔥',
    hidden: true,
    events: ['deposit'],
    check: (e) => e.type === 'deposit' && e.balanceBefore < -2000 && e.balanceAfter > 2000,
  },
  {
    key: 'ich_habs_ja',
    name: 'Ich habs ja',
    description: 'Eingezahlt obwohl der Kontostand positiv war',
    icon: '😏',
    hidden: true,
    events: ['deposit'],
    check: (e) => e.type === 'deposit' && e.balanceBefore > 0,
  },

  ...defineTieredAchievement({
    groupKey: 'dagobert',
    name: 'Dagobert',
    icon: '🤑',
    events: ['deposit'],
    hidden: true,
    check: (e) => (e.type === 'deposit' ? e.balanceAfter : 0),
    tiers: [
      {
        tier: 'bronze',
        description: 'Kontostand von 30 € erreicht',
        threshold: 3000,
      },
      {
        tier: 'silver',
        description: 'Kontostand von 50 € erreicht',
        threshold: 5000,
      },
      {
        tier: 'gold',
        description: 'Kontostand von 100 € erreicht',
        threshold: 10000,
      },
    ],
  }),

  // ── Tageszeit (standalone) ─────────────────────────────────────────────────
  {
    key: 'fruher_vogel',
    name: 'Früher Vogel',
    description: 'Kauf zwischen 6 und 10 Uhr',
    icon: '🌅',
    events: ['purchase'],
    check: (e) => {
      if (e.type !== 'purchase') return false;
      const h = getLocalHour(e.now);
      return h >= 6 && h < 10;
    },
  },
  {
    key: 'morgenrote',
    name: 'Morgenröte',
    description: 'Kauf zwischen 4 und 6 Uhr früh',
    icon: '🌄',
    hidden: true,
    events: ['purchase'],
    check: (e) => {
      if (e.type !== 'purchase') return false;
      const h = getLocalHour(e.now);
      return h >= 4 && h < 6;
    },
  },
  {
    key: 'geisterstunde',
    name: 'Geisterstunde',
    description: 'Kauf um genau Mitternacht (±10 Sek.)',
    icon: '👻',
    hidden: true,
    events: ['purchase'],
    check: (e) => {
      if (e.type !== 'purchase') return false;
      const h = getLocalHour(e.now);
      const m = getLocalMinute(e.now);
      const s = getLocalSecond(e.now);
      return (h === 0 && m === 0 && s <= 10) || (h === 23 && m === 59 && s >= 50);
    },
  },
  {
    key: 'happy_hour',
    name: 'Happy Hour',
    description: 'Kauf zwischen 16 und 18 Uhr',
    icon: '🍻',
    events: ['purchase'],
    check: (e) => {
      if (e.type !== 'purchase') return false;
      const h = getLocalHour(e.now);
      return h >= 16 && h < 18;
    },
  },
  {
    key: 'mittagspause',
    name: 'Mittagspause',
    description: 'Kauf zwischen 12 und 13 Uhr',
    icon: '☀️',
    events: ['purchase'],
    check: (e) => {
      if (e.type !== 'purchase') return false;
      const h = getLocalHour(e.now);
      return h >= 12 && h < 13;
    },
  },
  {
    key: 'monday_blues',
    name: 'Monday Blues',
    description: 'Mehr als 3 Getränke an einem Montag',
    icon: '😩',
    hidden: true,
    events: ['purchase'],
    check: async (e) => {
      if (e.type !== 'purchase') return false;
      if (getLocalWeekday(e.now) !== 1) return false;
      const count = await purchasesOnBiFiDay(e.userId, getBiFiDay(e.now));
      return count > 3;
    },
  },

  // ── Muster (tiered & standalone) ───────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'shopper',
    name: 'Shopper',
    icon: '🛍️',
    events: ['purchase'],
    check: async (e) => {
      if (e.type !== 'purchase') return 0;
      return await purchasesOnBiFiDay(e.userId, getBiFiDay(e.now));
    },
    tiers: [
      {
        tier: 'bronze',
        description: '5 Käufe an einem Tag',
        threshold: 5,
      },
      {
        tier: 'silver',
        description: '10 Käufe an einem Tag',
        threshold: 10,
      },
      {
        tier: 'gold',
        description: '15 Käufe an einem Tag',
        threshold: 15,
      },
    ],
  }),

  {
    key: 'schnellfeuer',
    name: 'Schnellfeuer',
    description: 'Mindestens 3 Käufe innerhalb einer Stunde mit je mind. 5 Min. Abstand',
    icon: '⚡',
    hidden: true,
    events: ['purchase'],
    check: async (e) => {
      if (e.type !== 'purchase') return false;
      const oneHourAgo = new Date(e.now.getTime() - 60 * 60 * 1000);
      const recent = await db
        .select({ createdAt: transactions.createdAt })
        .from(transactions)
        .where(eq(transactions.userId, e.userId));
      const rows = recent.filter((r) => r.createdAt >= oneHourAgo);
      if (rows.length < 3) return false;
      const sorted = rows.map((r) => r.createdAt.getTime()).sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i]! - sorted[i - 1]! < 5 * 60 * 1000) return false;
      }
      return true;
    },
  },
  {
    key: 'intervall_trinker',
    name: 'Intervall-Trinker',
    description: 'Drei aufeinanderfolgende Käufe mit gleichen Pausen (±1 Min.)',
    icon: '⏱️',
    hidden: true,
    events: ['purchase'],
    check: async (e) => {
      if (e.type !== 'purchase') return false;
      const lastThree = await db
        .select({ createdAt: transactions.createdAt })
        .from(transactions)
        .where(eq(transactions.userId, e.userId))
        .limit(3);
      if (lastThree.length < 3) return false;
      const times = lastThree.map((r) => r.createdAt.getTime()).sort((a, b) => a - b);
      const gap1 = times[1]! - times[0]!;
      const gap2 = times[2]! - times[1]!;
      return Math.abs(gap1 - gap2) <= 60000;
    },
  },

  ...defineTieredAchievement({
    groupKey: 'tagliches_ritual',
    name: 'Tägliches Ritual',
    icon: '📅',
    events: ['purchase'],
    check: async (e) => {
      if (e.type !== 'purchase') return 0;
      const all = await db
        .select({ createdAt: transactions.createdAt })
        .from(transactions)
        .where(eq(transactions.userId, e.userId));
      const distinctDays = [...new Set(all.map((r) => getBiFiDay(r.createdAt)))].sort().reverse();
      if (distinctDays.length === 0) return 0;
      let streak = 0;
      let current = getBiFiDay(e.now);
      for (let i = 0; i < distinctDays.length; i++) {
        if (distinctDays[i] === current) {
          streak++;
          const d = new Date(new Date(current).getTime() - 24 * 60 * 60 * 1000);
          current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else break;
      }
      return streak;
    },
    tiers: [
      {
        tier: 'bronze',
        description: '3 Tage in Folge eingekauft',
        threshold: 3,
      },
      {
        tier: 'silver',
        description: '5 Tage in Folge eingekauft',
        threshold: 5,
      },
      {
        tier: 'gold',
        description: '10 Tage in Folge eingekauft',
        threshold: 10,
      },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'treue_seele',
    name: 'Treue Seele',
    icon: '🗓️',
    events: ['purchase'],
    check: async (e) => {
      if (e.type !== 'purchase') return 0;
      const all = await db
        .select({ createdAt: transactions.createdAt })
        .from(transactions)
        .where(eq(transactions.userId, e.userId));
      const weekKeys = [
        ...new Set(
          all.map((r) => {
            const { year, week } = getISOWeek(r.createdAt);
            return `${year}-W${String(week).padStart(2, '0')}`;
          }),
        ),
      ]
        .sort()
        .reverse();
      if (weekKeys.length === 0) return 0;
      const { year, week } = getISOWeek(e.now);
      let streak = 0;
      let yr = year,
        wk = week;
      for (let i = 0; i < weekKeys.length; i++) {
        if (weekKeys[i] === `${yr}-W${String(wk).padStart(2, '0')}`) {
          streak++;
          wk--;
          if (wk === 0) {
            yr--;
            wk = 52;
          }
        } else break;
      }
      return streak;
    },
    tiers: [
      {
        tier: 'bronze',
        description: '4 aufeinanderfolgende Wochen bestellt',
        threshold: 4,
      },
      {
        tier: 'silver',
        description: '12 aufeinanderfolgende Wochen bestellt',
        threshold: 12,
      },
      {
        tier: 'gold',
        description: '26 aufeinanderfolgende Wochen bestellt',
        threshold: 26,
      },
    ],
  }),

  {
    key: 'weekend_warrior',
    name: 'Weekend-Warrior',
    description: 'An einem Wochenende sowohl Samstag als auch Sonntag gekauft',
    icon: '🏖️',
    events: ['purchase'],
    check: async (e) => {
      if (e.type !== 'purchase') return false;
      const w = getLocalWeekday(e.now);
      if (w !== 6 && w !== 7) return false;
      const all = await db
        .select({ createdAt: transactions.createdAt })
        .from(transactions)
        .where(eq(transactions.userId, e.userId));
      const todayStr = getBiFiDay(e.now);
      const otherDay = w === 6 ? 1 : -1;
      const d = new Date(new Date(todayStr).getTime() + otherDay * 24 * 60 * 60 * 1000);
      const otherStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const days = new Set(all.map((r) => getBiFiDay(r.createdAt)));
      return days.has(todayStr) && days.has(otherStr);
    },
  },
  {
    key: 'saisontrinker',
    name: 'Saisontrinker',
    description: 'In allen vier Jahreszeiten gekauft',
    icon: '🌍',
    hidden: true,
    events: ['purchase'],
    check: async (e) => {
      const all = await db
        .select({ createdAt: transactions.createdAt })
        .from(transactions)
        .where(eq(transactions.userId, e.userId));
      const seasons = new Set<string>();
      for (const r of all) {
        const m = toLocalTime(r.createdAt).getUTCMonth() + 1;
        if (m >= 3 && m <= 5) seasons.add('spring');
        else if (m >= 6 && m <= 8) seasons.add('summer');
        else if (m >= 9 && m <= 11) seasons.add('autumn');
        else seasons.add('winter');
      }
      return seasons.size >= 4;
    },
  },
  {
    key: 'feierlaune',
    name: 'Feierlaune',
    description: 'An einem Feiertag (Weihnachten, Neujahr, Halloween) gekauft',
    icon: '🎉',
    hidden: true,
    events: ['purchase'],
    check: (e) => {
      if (e.type !== 'purchase') return false;
      const b = toLocalTime(e.now);
      const mm = b.getUTCMonth() + 1,
        dd = b.getUTCDate();
      return (mm === 12 && dd === 25) || (mm === 1 && dd === 1) || (mm === 10 && dd === 31);
    },
  },

  // ── Sozial (tiered & standalone) ───────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'die_runde_geht_auf_mich',
    name: 'Die Runde geht auf mich',
    icon: '🥳',
    events: ['purchase'],
    check: (e) => {
      if (e.type !== 'purchase') return 0;
      return e.items.reduce((s, i) => s + i.quantity, 0);
    },
    tiers: [
      {
        tier: 'bronze',
        description: '3 Items in einer Transaktion',
        threshold: 3,
      },
      {
        tier: 'silver',
        description: '5 Items in einer Transaktion',
        threshold: 5,
      },
      {
        tier: 'gold',
        description: '10 Items in einer Transaktion',
        threshold: 10,
      },
    ],
  }),

  {
    key: 'wein_buddy',
    name: 'Wein-Buddy',
    description: 'Gruppenbestellung mit einem Wein',
    icon: '🍷',
    hidden: true,
    events: ['purchase'],
    check: (e) =>
      e.type === 'purchase' &&
      !!e.groupId &&
      e.items.some((i) => i.buyableName.toLowerCase().includes('wein')),
  },
  {
    key: 'party',
    name: 'Party',
    description: 'Erste Gruppenbestellung',
    icon: '🎊',
    events: ['purchase'],
    check: (e) => e.type === 'purchase' && !!e.groupId,
  },

  // ── Lucky (standalone) ─────────────────────────────────────────────────────
  {
    key: 'lucky_seven',
    name: 'Lucky Seven',
    description: 'Die 7., 77., 777., ... Transaktion im System',
    icon: '7️⃣',
    hidden: true,
    events: ['purchase'],
    check: async () => isAllSevens(await globalPurchaseCount()),
  },

  // ── Jackpot (tiered) ───────────────────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'jackpot_plays',
    name: 'Die Sonne lacht',
    icon: '🎰',
    events: ['jackpot'],
    progress: (userId) => jackpotPlayCount(userId),
    tiers: [
      { tier: 'bronze', description: '1× am Jackpot gespielt', threshold: 1 },
      { tier: 'silver', description: '25× am Jackpot gespielt', threshold: 25 },
      { tier: 'gold', description: '100× am Jackpot gespielt', threshold: 100 },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'gluckspilz',
    name: 'Glückspilz',
    icon: '🍀',
    hidden: true,
    events: ['jackpot'],
    progress: (userId) => jackpotWinCount(userId),
    tiers: [
      {
        tier: 'bronze',
        description: '1× den Jackpot geknackt (0×)',
        threshold: 1,
      },
      {
        tier: 'silver',
        description: '10× den Jackpot geknackt (0×)',
        threshold: 10,
      },
      {
        tier: 'gold',
        description: '50× den Jackpot geknackt (0×)',
        threshold: 50,
      },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'pechvogel',
    name: 'Pechvogel',
    icon: '🐦',
    hidden: true,
    events: ['jackpot'],
    progress: (userId) => jackpotLossCount(userId),
    tiers: [
      { tier: 'bronze', description: '1× doppelt gezahlt (2×)', threshold: 1 },
      {
        tier: 'silver',
        description: '10× doppelt gezahlt (2×)',
        threshold: 10,
      },
      { tier: 'gold', description: '50× doppelt gezahlt (2×)', threshold: 50 },
    ],
  }),
  // ── Rabatte (tiered) ────────────────────────────────────────────────────────
  ...defineTieredAchievement({
    groupKey: 'deal_hunter',
    name: 'Schnäppchenjäger',
    icon: '🏷️',
    events: ['purchase'],
    progress: (userId) => discountedItemCount(userId),
    tiers: [
      { tier: 'bronze', description: '1 rabattiertes Produkt gekauft', threshold: 1 },
      { tier: 'silver', description: '15 rabattierte Produkte gekauft', threshold: 15 },
      { tier: 'gold', description: '50 rabattierte Produkte gekauft', threshold: 50 },
    ],
  }),

  ...defineTieredAchievement({
    groupKey: 'savings_fox',
    name: 'Sparfuchs',
    icon: '🦊',
    events: ['purchase'],
    progressFormat: 'cents',
    progress: (userId) => totalSavedCents(userId),
    tiers: [
      { tier: 'bronze', description: '1 € gespart', threshold: 100 },
      { tier: 'silver', description: '10 € gespart', threshold: 1000 },
      { tier: 'gold', description: '50 € gespart', threshold: 5000 },
    ],
  }),

  // ── Kontingent-Aktionen (hidden standalone) ─────────────────────────────────
  {
    key: 'resteverwerter',
    name: 'Resteverwerter',
    description: 'Das letzte Stück einer Kontingent-Aktion gekauft',
    icon: '🗑️',
    hidden: true,
    events: ['promo_exhausted_buyer'],
    check: (e) => e.type === 'promo_exhausted_buyer',
  },
  {
    key: 'erster',
    name: 'Erster!',
    description: 'Als erstes aus einer neuen Kontingent-Aktion gekauft',
    icon: '🚀',
    hidden: true,
    events: ['promo_first_buyer'],
    check: (e) => e.type === 'promo_first_buyer',
  },
]; // Ende von ACHIEVEMENT_REGISTRY
