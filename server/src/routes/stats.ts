import { Hono } from 'hono';
import { and, desc, eq, gte, isNull, or, sql, type SQL } from 'drizzle-orm';
import { type AnyPgTable, type PgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db/index.ts';
import {
  buyables,
  groups,
  nudges,
  prostVouchers,
  transactionItems,
  transactions,
  userFriendships,
  users,
} from '../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { getLocalHour, getLocalWeekday } from '../services/achievements.ts';
import { type BuyableCategory } from '../../../shared/src/types.ts';

const router = new Hono();

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface FinanceStats {
  totalSpent: number;
  avgPerMonth: number;
  avgPerTransaction: number;
  biggestPurchase: number;
  currentBalance: number;
  totalSaved: number;
  discountedItemCount: number;
}

interface ConsumptionStats {
  topItems: { name: string; count: number }[];
  categories: { category: BuyableCategory | null; count: number }[];
  weekdayCounts: Record<number, number>;
  hourCounts: Record<number, number>;
  totalPurchases: number;
}

interface SocialStats {
  prostSent: number;
  prostReceived: number;
  nudgeSent: number;
  nudgeReceived: number;
  topRecipient: { displayName: string; count: number } | null;
  topSender: { displayName: string; count: number } | null;
}

interface JackpotStats {
  totalSpins: number;
  balance: number;
  wins: number;
  losses: number;
  avgMultiplier: number;
}

interface UserStats {
  finances: FinanceStats | null;
  consumption: ConsumptionStats | null;
  social: SocialStats | null;
  jackpot: JackpotStats | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPeriodFilter(period: string | undefined): ReturnType<typeof gte> | null {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return gte(transactions.createdAt, d);
  }
  if (period === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return gte(transactions.createdAt, d);
  }
  return null;
}

function getPeriodFilterGeneric(
  table: AnyPgTable & { createdAt: PgColumn },
  period: string | undefined,
): SQL | null {
  const now = new Date();
  let d: Date | null = null;
  if (period === 'week') {
    d = new Date(now);
    d.setDate(d.getDate() - 7);
  } else if (period === 'month') {
    d = new Date(now);
    d.setMonth(d.getMonth() - 1);
  }
  return d ? gte(table.createdAt, d) : null;
}

async function getRelationship(
  selfId: string,
  targetId: string,
): Promise<'self' | 'friend' | 'none'> {
  if (selfId === targetId) return 'self';
  const [friendship] = await db
    .select()
    .from(userFriendships)
    .where(
      and(
        eq(userFriendships.status, 'accepted'),
        or(
          and(eq(userFriendships.requesterId, selfId), eq(userFriendships.addresseeId, targetId)),
          and(eq(userFriendships.requesterId, targetId), eq(userFriendships.addresseeId, selfId)),
        ),
      ),
    )
    .limit(1);
  return friendship ? 'friend' : 'none';
}

// ─── GET /api/stats/user/:id ─────────────────────────────────────────────────

router.get('/user/:id', requireAuth, async (c) => {
  const { id } = c.req.param();
  const period = c.req.query('period'); // week, month, alltime
  const self = c.get('user');
  const rel = await getRelationship(self.id, id);

  const txnFilter = getPeriodFilter(period);
  const genericFilter = (table: AnyPgTable & { createdAt: PgColumn }): SQL | null =>
    getPeriodFilterGeneric(table, period);

  const stats: UserStats = {
    finances: null,
    consumption: null,
    social: null,
    jackpot: null,
  };

  // 1. Finances (Self only)
  if (rel === 'self') {
    const [financeData] = await db
      .select({
        totalSpent: sql<number>`abs(coalesce(sum(${transactions.totalAmount}), 0))::int`,
        avgPerMonth: sql<number>`abs(coalesce(sum(${transactions.totalAmount}), 0) / nullif(count(distinct date_trunc('month', ${transactions.createdAt})), 0))::int`,
        avgPerTransaction: sql<number>`abs(coalesce(avg(${transactions.totalAmount}), 0))::int`,
        biggestPurchase: sql<number>`abs(min(${transactions.totalAmount}))::int`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, id),
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          txnFilter ?? sql`true`,
        ),
      );

    const [discountData] = await db
      .select({
        totalSaved: sql<number>`coalesce(sum(${transactionItems.discountSavedCents}), 0)::int`,
        discountedItemCount: sql<number>`coalesce(sum(case when ${transactionItems.discountSavedCents} > 0 then ${transactionItems.quantity} else 0 end), 0)::int`,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .where(
        and(
          eq(transactions.userId, id),
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          txnFilter ?? sql`true`,
        ),
      );

    if (financeData) {
      stats.finances = {
        totalSpent: financeData.totalSpent,
        avgPerMonth: financeData.avgPerMonth,
        avgPerTransaction: financeData.avgPerTransaction,
        biggestPurchase: financeData.biggestPurchase,
        currentBalance: self.balance,
        totalSaved: discountData?.totalSaved ?? 0,
        discountedItemCount: discountData?.discountedItemCount ?? 0,
      };
    }
  }

  // 2. Consumption (Self & Friends)
  if (rel === 'self' || rel === 'friend') {
    const topItems = await db
      .select({ name: buyables.name, count: sql<number>`count(*)::int` })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
      .where(
        and(
          eq(transactions.userId, id),
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          txnFilter ?? sql`true`,
        ),
      )
      .groupBy(buyables.id, buyables.name)
      .orderBy(desc(sql`count(*)`))
      .limit(3);

    const categoriesResult = await db
      .select({ category: buyables.category, count: sql<number>`count(*)::int` })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
      .where(
        and(
          eq(transactions.userId, id),
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          txnFilter ?? sql`true`,
        ),
      )
      .groupBy(buyables.category);

    const categories = categoriesResult.map((r) => ({
      category: r.category as BuyableCategory | null,
      count: r.count,
    }));

    const allTxns = await db
      .select({ createdAt: transactions.createdAt })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, id),
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          txnFilter ?? sql`true`,
        ),
      );

    const weekdayCounts: Record<number, number> = {};
    const hourCounts: Record<number, number> = {};
    allTxns.forEach((t) => {
      const w = getLocalWeekday(t.createdAt);
      const h = getLocalHour(t.createdAt);
      weekdayCounts[w] = (weekdayCounts[w] ?? 0) + 1;
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    });

    stats.consumption = {
      topItems,
      categories,
      weekdayCounts,
      hourCounts,
      totalPurchases: allTxns.length,
    };
  }

  // 3. Social (Public)
  const nf = genericFilter(nudges);
  const pvf = genericFilter(prostVouchers);

  const [[prostSent], [prostReceived], [nudgeSent], [nudgeReceived], [topRecipient], [topSender]] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(prostVouchers)
        .where(and(eq(prostVouchers.fromUserId, id), pvf ?? sql`true`)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(prostVouchers)
        .where(and(eq(prostVouchers.toUserId, id), pvf ?? sql`true`)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(nudges)
        .where(and(eq(nudges.senderId, id), nf ?? sql`true`)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(nudges)
        .where(and(eq(nudges.recipientId, id), nf ?? sql`true`)),
      db
        .select({ displayName: users.displayName, count: sql<number>`count(*)::int` })
        .from(prostVouchers)
        .innerJoin(users, eq(prostVouchers.toUserId, users.id))
        .where(and(eq(prostVouchers.fromUserId, id), pvf ?? sql`true`))
        .groupBy(users.id, users.displayName)
        .orderBy(desc(sql`count(*)`))
        .limit(1),
      db
        .select({ displayName: users.displayName, count: sql<number>`count(*)::int` })
        .from(prostVouchers)
        .innerJoin(users, eq(prostVouchers.fromUserId, users.id))
        .where(and(eq(prostVouchers.toUserId, id), pvf ?? sql`true`))
        .groupBy(users.id, users.displayName)
        .orderBy(desc(sql`count(*)`))
        .limit(1),
    ]);

  stats.social = {
    prostSent: prostSent?.count ?? 0,
    prostReceived: prostReceived?.count ?? 0,
    nudgeSent: nudgeSent?.count ?? 0,
    nudgeReceived: nudgeReceived?.count ?? 0,
    topRecipient: topRecipient ?? null,
    topSender: topSender ?? null,
  };

  // 4. Jackpot (Self & Friends)
  if (rel === 'self' || rel === 'friend') {
    const [jackpotData] = await db
      .select({
        count: sql<number>`count(*)::int`,
        balance: sql<number>`sum(${transactionItems.unitPrice} - ${transactionItems.totalPrice})::int`,
        wins: sql<number>`count(*) filter (where ${transactions.jackpotMultiplier} = '0.00')::int`,
        losses: sql<number>`count(*) filter (where ${transactions.jackpotMultiplier} = '2.00')::int`,
        avgMultiplier: sql<number>`avg(${transactions.jackpotMultiplier}::numeric)::float`,
      })
      .from(transactions)
      .innerJoin(transactionItems, eq(transactions.id, transactionItems.transactionId))
      .where(
        and(
          eq(transactions.userId, id),
          eq(transactions.type, 'jackpot'),
          isNull(transactions.cancelledAt),
          txnFilter ?? sql`true`,
        ),
      );

    stats.jackpot = {
      totalSpins: jackpotData?.count ?? 0,
      balance: jackpotData?.balance ?? 0,
      wins: jackpotData?.wins ?? 0,
      losses: jackpotData?.losses ?? 0,
      avgMultiplier: jackpotData?.avgMultiplier ?? 1.0,
    };
  }

  return c.json(stats);
});

// ─── GET /api/stats/system ───────────────────────────────────────────────────

router.get('/system', requireAuth, async (c) => {
  const period = c.req.query('period');
  const txnFilter = getPeriodFilter(period);
  const genericFilter = (table: AnyPgTable & { createdAt: PgColumn }): SQL | null =>
    getPeriodFilterGeneric(table, period);

  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.isActive, true));
  const [txnCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(isNull(transactions.cancelledAt), txnFilter ?? sql`true`));

  const nf = genericFilter(nudges);
  const [nudgeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(nudges)
    .where(nf ?? sql`true`);

  const gf = genericFilter(groups);
  const [groupCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(groups)
    .where(gf ?? sql`true`);

  const [financeStats] = await db
    .select({
      totalRevenue: sql<number>`abs(coalesce(sum(${transactions.totalAmount}), 0))::int`,
      avgTransaction: sql<number>`abs(coalesce(avg(${transactions.totalAmount}), 0))::int`,
      biggestPurchase: sql<number>`abs(min(${transactions.totalAmount}))::int`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'purchase'),
        isNull(transactions.cancelledAt),
        txnFilter ?? sql`true`,
      ),
    );

  const [drinkCount] = await db
    .select({ count: sql<number>`sum(${transactionItems.quantity})::int` })
    .from(transactionItems)
    .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
    .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
    .where(
      and(
        isNull(transactions.cancelledAt),
        or(eq(buyables.category, 'alcoholic'), eq(buyables.category, 'soft_drink')),
        txnFilter ?? sql`true`,
      ),
    );

  const [topItem] = await db
    .select({ name: buyables.name, count: sql<number>`sum(${transactionItems.quantity})::int` })
    .from(transactionItems)
    .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
    .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
    .where(and(isNull(transactions.cancelledAt), txnFilter ?? sql`true`))
    .groupBy(buyables.id, buyables.name)
    .orderBy(desc(sql`sum(${transactionItems.quantity})`))
    .limit(1);

  const [jackpotStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      balance: sql<number>`sum(${transactionItems.totalPrice} - ${transactionItems.unitPrice})::int`,
    })
    .from(transactions)
    .innerJoin(transactionItems, eq(transactions.id, transactionItems.transactionId))
    .where(
      and(
        eq(transactions.type, 'jackpot'),
        isNull(transactions.cancelledAt),
        txnFilter ?? sql`true`,
      ),
    );

  const pvf = genericFilter(prostVouchers);
  const [totalProst] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prostVouchers)
    .where(pvf ?? sql`true`);

  const [systemDiscountData] = await db
    .select({
      totalSaved: sql<number>`coalesce(sum(${transactionItems.discountSavedCents}), 0)::int`,
      discountedItemCount: sql<number>`coalesce(sum(case when ${transactionItems.discountSavedCents} > 0 then ${transactionItems.quantity} else 0 end), 0)::int`,
    })
    .from(transactionItems)
    .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
    .where(and(isNull(transactions.cancelledAt), txnFilter ?? sql`true`));

  const revenue = financeStats?.totalRevenue ?? 0;
  const usersActive = userCount?.count ?? 1;

  return c.json({
    totalUsers: userCount?.count ?? 0,
    totalTransactions: txnCount?.count ?? 0,
    totalNudges: nudgeCount?.count ?? 0,
    totalGroups: groupCount?.count ?? 0,
    totalRevenue: revenue,
    avgTransactionAmount: financeStats?.avgTransaction ?? 0,
    avgRevenuePerMember: Math.round(revenue / (usersActive || 1)),
    totalDrinksConsumed: drinkCount?.count ?? 0,
    mostPopularItem: topItem ?? null,
    biggestPurchase: financeStats?.biggestPurchase ?? 0,
    allTimeJackpotSpins: jackpotStats?.count ?? 0,
    systemJackpotBalance: jackpotStats?.balance ?? 0,
    allTimeProstSent: totalProst?.count ?? 0,
    totalSystemSaved: systemDiscountData?.totalSaved ?? 0,
    totalDiscountedItems: systemDiscountData?.discountedItemCount ?? 0,
  });
});

export default router;
