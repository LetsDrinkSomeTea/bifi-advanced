import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { donationContributions, prostVouchers, transactions, userAchievements } from '../db/schema.ts'
import { emitFeedEvent } from './feed.ts'
import { ACHIEVEMENTS } from '../../../shared/src/achievements.ts'
import type { AchievementKey } from '../../../shared/src/achievements.ts'
import { createNotification } from './notifications.ts'

// ─── Event types ──────────────────────────────────────────────────────────────

export type AchievementEvent =
  | { type: 'purchase'; userId: string; purchaseHour: number }
  | { type: 'prost_sent'; userId: string }
  | { type: 'prost_received'; userId: string }
  | { type: 'group_founded'; userId: string }
  | { type: 'jackpot'; userId: string; multiplier: number }
  | { type: 'contribution'; userId: string }

type CheckContext = { userId: string; event: AchievementEvent }

type Rule = {
  key: AchievementKey
  triggers: Array<AchievementEvent['type']>
  check: (ctx: CheckContext) => Promise<boolean>
}

// ─── Reusable counters ────────────────────────────────────────────────────────

const count = async (q: Promise<Array<{ n: number }>>) => (await q)[0]?.n ?? 0

const purchaseCount = (userId: string) =>
  count(
    db.select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt))),
  )

const prostSentCount = (userId: string) =>
  count(db.select({ n: sql<number>`count(*)::int` }).from(prostVouchers).where(eq(prostVouchers.fromUserId, userId)))

const prostReceivedCount = (userId: string) =>
  count(db.select({ n: sql<number>`count(*)::int` }).from(prostVouchers).where(eq(prostVouchers.toUserId, userId)))

const donationCount = (userId: string) =>
  count(db.select({ n: sql<number>`count(*)::int` }).from(donationContributions).where(eq(donationContributions.userId, userId)))

// ─── Rule registry ────────────────────────────────────────────────────────────
//
// To add a new achievement:
//   1. Add its definition to shared/src/achievements.ts
//   2. Push one rule here — triggers = which events can unlock it,
//      check = returns true when the threshold is reached
//
const rules: Rule[] = [
  // Käufe
  { key: 'purchases_bronze', triggers: ['purchase'], check: async ({ userId }) => await purchaseCount(userId) >= 1 },
  { key: 'purchases_silver', triggers: ['purchase'], check: async ({ userId }) => await purchaseCount(userId) >= 10 },
  { key: 'purchases_gold',   triggers: ['purchase'], check: async ({ userId }) => await purchaseCount(userId) >= 100 },

  // Tageszeit
  { key: 'early_bird', triggers: ['purchase'], check: async ({ event }) => event.type === 'purchase' && event.purchaseHour < 8 },
  { key: 'night_owl',  triggers: ['purchase'], check: async ({ event }) => event.type === 'purchase' && event.purchaseHour >= 23 },

  // Prost gesendet
  { key: 'prost_sent_bronze', triggers: ['prost_sent'], check: async ({ userId }) => await prostSentCount(userId) >= 5 },
  { key: 'prost_sent_silver', triggers: ['prost_sent'], check: async ({ userId }) => await prostSentCount(userId) >= 15 },
  { key: 'prost_sent_gold',   triggers: ['prost_sent'], check: async ({ userId }) => await prostSentCount(userId) >= 30 },

  // Prost erhalten
  { key: 'prost_received_bronze', triggers: ['prost_received'], check: async ({ userId }) => await prostReceivedCount(userId) >= 10 },
  { key: 'prost_received_silver', triggers: ['prost_received'], check: async ({ userId }) => await prostReceivedCount(userId) >= 25 },
  { key: 'prost_received_gold',   triggers: ['prost_received'], check: async ({ userId }) => await prostReceivedCount(userId) >= 50 },

  // Soziales
  { key: 'group_founder', triggers: ['group_founded'], check: async () => true },

  // Jackpot
  { key: 'jackpot_winner', triggers: ['jackpot'], check: async ({ event }) => event.type === 'jackpot' && event.multiplier === 0 },

  // Spenden
  { key: 'donations_bronze', triggers: ['contribution'], check: async ({ userId }) => await donationCount(userId) >= 3 },
  { key: 'donations_silver', triggers: ['contribution'], check: async ({ userId }) => await donationCount(userId) >= 10 },
  { key: 'donations_gold',   triggers: ['contribution'], check: async ({ userId }) => await donationCount(userId) >= 25 },
]

// ─── Engine ───────────────────────────────────────────────────────────────────

async function tryUnlock(userId: string, key: string): Promise<boolean> {
  try {
    await db.insert(userAchievements).values({ userId, achievementKey: key })
    return true
  } catch {
    return false // unique constraint → already unlocked
  }
}

function notifyAchievement(userId: string, key: AchievementKey) {
  const def = ACHIEVEMENTS[key]
  const tierSuffix = def.tier ? ` (${def.tier === 'bronze' ? '🥉' : def.tier === 'silver' ? '🥈' : '🥇'})` : ''
  createNotification({
    userId,
    type: 'achievement',
    title: `${def.icon} Achievement freigeschaltet!`,
    message: `${def.name}${tierSuffix}: ${def.description}`,
  }).catch(console.error)
  emitFeedEvent({ type: 'achievement', userId, metadata: { achievementKey: key } })
}

export async function checkAchievements(event: AchievementEvent): Promise<void> {
  const { userId } = event
  const triggered = rules.filter((r) => r.triggers.includes(event.type))

  await Promise.all(
    triggered.map(async (rule) => {
      try {
        const met = await rule.check({ userId, event })
        if (!met) return
        // Pre-check avoids a noisy unique-constraint error on every re-trigger
        const [existing] = await db
          .select({ id: userAchievements.id })
          .from(userAchievements)
          .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, rule.key)))
          .limit(1)
        if (!existing && await tryUnlock(userId, rule.key)) {
          notifyAchievement(userId, rule.key)
        }
      } catch (err) {
        console.error(`Achievement check failed for "${rule.key}":`, err)
      }
    }),
  )
}
