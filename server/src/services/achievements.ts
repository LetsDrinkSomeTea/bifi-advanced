import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.ts";
import {
  buyables,
  donationContributions,
  prostVouchers,
  transactionItems,
  transactions,
  userAchievements,
} from "../db/schema.ts";
import { emitFeedEvent } from "./feed.ts";
import {
  type AchievementEvent,
  type AchievementKey,
} from "../../../shared/src/achievements.ts";
import { createNotification } from "./notifications.ts";
import { ACHIEVEMENT_REGISTRY } from "./achievements/registry.ts";

// ─── Timezone helpers (respects TZ env var) ──────────────────────────────────

export const APP_TZ = process.env.TZ || "Europe/Berlin";

/** Converts any date to a Date object representing the same wall clock time in the configured TZ */
export function toLocalTime(d: Date): Date {
  const str = d.toLocaleString("en-CA", {
    timeZone: APP_TZ,
    hour12: false,
  });
  return new Date(str.replace(",", ""));
}

/** Legacy alias for toLocalTime */
export const toBerlin = toLocalTime;

export function getBiFiDay(date: Date): string {
  const local = toLocalTime(date);
  const h = local.getUTCHours();
  const d = new Date(local);
  if (h < 4) d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getLocalHour(date: Date): number {
  return toLocalTime(date).getUTCHours();
}
export const getBerlinHour = getLocalHour;

export function getLocalMinute(date: Date): number {
  return toLocalTime(date).getUTCMinutes();
}
export const getBerlinMinute = getLocalMinute;

export function getLocalSecond(date: Date): number {
  return toLocalTime(date).getUTCSeconds();
}
export const getBerlinSecond = getLocalSecond;

/** Returns ISO weekday: Monday=1 ... Sunday=7 in local time */
export function getLocalWeekday(date: Date): number {
  const local = toLocalTime(date);
  const d = local.getUTCDay(); // 0=Sun
  return d === 0 ? 7 : d;
}
export const getBerlinWeekday = getLocalWeekday;

/** Returns ISO week number for a local date */
export function getISOWeek(date: Date): { year: number; week: number } {
  const local = toLocalTime(date);
  const d = new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
    ),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: d.getUTCFullYear(), week };
}

export function isAllSevens(n: number): boolean {
  return String(n)
    .split("")
    .every((c) => c === "7");
}

// ─── Reusable counters ────────────────────────────────────────────────────────

const countQ = async (q: Promise<Array<{ n: number }>>) => (await q)[0]?.n ?? 0;

export const purchaseCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "purchase"),
          isNull(transactions.cancelledAt),
        ),
      ),
  );

export const prostSentCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(prostVouchers)
      .where(eq(prostVouchers.fromUserId, userId)),
  );

export const prostReceivedCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(prostVouchers)
      .where(eq(prostVouchers.toUserId, userId)),
  );

export const donationCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(donationContributions)
      .where(eq(donationContributions.userId, userId)),
  );

export const unlockedAchievementCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId)),
  );

export const categoryItemCount = (userId: string, category: string) =>
  countQ(
    db
      .select({
        n: sql<number>`coalesce(sum(${transactionItems.quantity}), 0)::int`,
      })
      .from(transactionItems)
      .innerJoin(
        transactions,
        eq(transactionItems.transactionId, transactions.id),
      )
      .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "purchase"),
          isNull(transactions.cancelledAt),
          eq(buyables.category, category as any),
        ),
      ),
  );

export const purchasesOnBiFiDay = async (
  userId: string,
  bifiDay: string,
): Promise<number> => {
  const rows = await db
    .select({ createdAt: transactions.createdAt })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "purchase"),
        isNull(transactions.cancelledAt),
      ),
    );
  return rows.filter((r) => getBiFiDay(r.createdAt) === bifiDay).length;
};

export const globalPurchaseCount = () =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "purchase"),
          isNull(transactions.cancelledAt),
        ),
      ),
  );

// ─── Engine helpers ───────────────────────────────────────────────────────────

async function tryUnlock(userId: string, key: string): Promise<boolean> {
  try {
    await db.insert(userAchievements).values({ userId, achievementKey: key });
    return true;
  } catch {
    return false; // unique constraint → already unlocked
  }
}

async function notifyAchievement(
  userId: string,
  key: AchievementKey,
): Promise<void> {
  const def = ACHIEVEMENT_REGISTRY.find((a) => a.key === key);
  if (!def) return;

  const tierSuffix = def.tier
    ? ` (${def.tier === "bronze" ? "🥉" : def.tier === "silver" ? "🥈" : "🥇"})`
    : "";
  createNotification({
    userId,
    type: "achievement",
    title: `${def.icon} Achievement freigeschaltet!`,
    message: `${def.name}${tierSuffix}: ${def.description}`,
  }).catch(console.error);
  emitFeedEvent({
    type: "achievement",
    userId,
    metadata: { achievementKey: key },
  });

  // After every unlock, check achievements_collected tiers
  await checkAchievementsCollected(userId);
}

async function checkAchievementsCollected(userId: string): Promise<void> {
  const count = await unlockedAchievementCount(userId);
  const tiers = ACHIEVEMENT_REGISTRY.filter(
    (a) => a.groupKey === "achievements_collected",
  );

  for (const t of tiers) {
    if (t.threshold !== undefined && count >= t.threshold) {
      // We use tryUnlock/notifyAchievement directly to avoid infinite recursion if we used tryAward
      // actually tryAward is safe because it checks alreadyUnlocked.
      // But to be 100% sure and avoid extra DB queries in the recursion:
      const already = await alreadyUnlocked(userId, t.key);
      if (!already && (await tryUnlock(userId, t.key))) {
        const tierSuffix = t.tier
          ? ` (${t.tier === "bronze" ? "🥉" : t.tier === "silver" ? "🥈" : "🥇"})`
          : "";
        createNotification({
          userId,
          type: "achievement",
          title: `${t.icon} Achievement freigeschaltet!`,
          message: `${t.name}${tierSuffix}: ${t.description}`,
        }).catch(console.error);
        emitFeedEvent({
          type: "achievement",
          userId,
          metadata: { achievementKey: t.key },
        });
        // Do NOT call checkAchievementsCollected again here
      }
    }
  }
}

async function alreadyUnlocked(userId: string, key: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: userAchievements.id })
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementKey, key),
      ),
    )
    .limit(1);
  return !!existing;
}

async function tryAward(userId: string, key: AchievementKey): Promise<void> {
  if (!(await alreadyUnlocked(userId, key)) && (await tryUnlock(userId, key))) {
    await notifyAchievement(userId, key);
  }
}

export const jackpotPlayCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "jackpot"),
          isNull(transactions.cancelledAt),
        ),
      ),
  );

export const jackpotWinCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "jackpot"),
          isNull(transactions.cancelledAt),
          sql`${transactions.jackpotMultiplier} = 0`,
        ),
      ),
  );

export const jackpotLossCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "jackpot"),
          isNull(transactions.cancelledAt),
          sql`${transactions.jackpotMultiplier} = 2`,
        ),
      ),
  );

// ─── Main export ──────────────────────────────────────────────────────────────

export async function checkAchievements(
  event: AchievementEvent,
): Promise<void> {
  const { userId } = event;

  try {
    const relevant = ACHIEVEMENT_REGISTRY.filter((a) =>
      a.events.includes(event.type),
    );
    for (const def of relevant) {
      const isMet = await def.check(event);
      if (isMet) {
        await tryAward(userId, def.key);
      }
    }
  } catch (err) {
    console.error(`Achievement check failed for event "${event.type}":`, err);
  }
}
