import { and, eq, gte, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  buyables,
  donationContributions,
  prostVouchers,
  transactionItems,
  transactions,
  userAchievements,
  users,
} from '../db/schema.ts'
import { emitFeedEvent } from './feed.ts'
import { ACHIEVEMENTS } from '../../../shared/src/achievements.ts'
import type { AchievementKey } from '../../../shared/src/achievements.ts'
import { createNotification } from './notifications.ts'

// ─── Timezone helpers (Intl-based, no date-fns-tz needed) ────────────────────

function toBerlin(d: Date): Date {
  // Convert a UTC Date to a Date object whose UTC fields reflect Berlin local time
  const str = d.toLocaleString('en-CA', { timeZone: 'Europe/Berlin', hour12: false })
  // en-CA gives "YYYY-MM-DD, HH:MM:SS" — normalize the comma
  return new Date(str.replace(',', ''))
}

function getBiFiDay(date: Date): string {
  const berlin = toBerlin(date)
  const h = berlin.getUTCHours()
  const d = new Date(berlin)
  if (h < 4) d.setUTCDate(d.getUTCDate() - 1)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getBerlinHour(date: Date): number {
  return toBerlin(date).getUTCHours()
}

function getBerlinMinute(date: Date): number {
  return toBerlin(date).getUTCMinutes()
}

function getBerlinSecond(date: Date): number {
  return toBerlin(date).getUTCSeconds()
}

/** Returns ISO weekday: Monday=1 ... Sunday=7 */
function getBerlinWeekday(date: Date): number {
  const berlin = toBerlin(date)
  const d = berlin.getUTCDay() // 0=Sun
  return d === 0 ? 7 : d
}

/** Returns ISO week number for a Berlin-local date */
function getISOWeek(date: Date): { year: number; week: number } {
  const berlin = toBerlin(date)
  // Copy to avoid mutation
  const d = new Date(Date.UTC(berlin.getUTCFullYear(), berlin.getUTCMonth(), berlin.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function isAllSevens(n: number): boolean {
  return String(n).split('').every((c) => c === '7')
}

// ─── Event types ──────────────────────────────────────────────────────────────

export type AchievementEvent =
  | {
      type: 'purchase'
      userId: string
      now: Date
      items: Array<{ buyableId: string; variantId: string; category: string | null; quantity: number; buyableName: string }>
      groupId?: string
    }
  | { type: 'prost_sent'; userId: string }
  | { type: 'prost_received'; userId: string }
  | { type: 'group_founded'; userId: string }
  | { type: 'jackpot'; userId: string; multiplier: number }
  | { type: 'contribution'; userId: string }
  | { type: 'deposit'; userId: string; amount: number; balanceBefore: number; balanceAfter: number }
  | { type: 'friendship_accepted'; userId: string }

// ─── Reusable counters ────────────────────────────────────────────────────────

const countQ = async (q: Promise<Array<{ n: number }>>) => (await q)[0]?.n ?? 0

export const purchaseCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt))),
  )

export const prostSentCount = (userId: string) =>
  countQ(
    db.select({ n: sql<number>`count(*)::int` }).from(prostVouchers).where(eq(prostVouchers.fromUserId, userId)),
  )

export const prostReceivedCount = (userId: string) =>
  countQ(
    db.select({ n: sql<number>`count(*)::int` }).from(prostVouchers).where(eq(prostVouchers.toUserId, userId)),
  )

export const donationCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(donationContributions)
      .where(eq(donationContributions.userId, userId)),
  )

export const unlockedAchievementCount = (userId: string) =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId)),
  )

export const categoryItemCount = (userId: string, category: string) =>
  countQ(
    db
      .select({ n: sql<number>`coalesce(sum(${transactionItems.quantity}), 0)::int` })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
      .innerJoin(buyables, eq(transactionItems.buyableId, buyables.id))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'purchase'),
          isNull(transactions.cancelledAt),
          eq(buyables.category, category as 'alcoholic' | 'soft_drink' | 'food' | 'snack' | 'other'),
        ),
      ),
  )

const purchasesOnBiFiDay = async (userId: string, bifiDay: string): Promise<number> => {
  // Get all purchase timestamps for the user and filter to BiFi-day
  const rows = await db
    .select({ createdAt: transactions.createdAt })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt)))
  return rows.filter((r) => getBiFiDay(r.createdAt) === bifiDay).length
}

const globalPurchaseCount = () =>
  countQ(
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt))),
  )

// ─── Engine helpers ───────────────────────────────────────────────────────────

async function tryUnlock(userId: string, key: string): Promise<boolean> {
  try {
    await db.insert(userAchievements).values({ userId, achievementKey: key })
    return true
  } catch {
    return false // unique constraint → already unlocked
  }
}

async function notifyAchievement(userId: string, key: AchievementKey): Promise<void> {
  const def = ACHIEVEMENTS[key]
  const tierSuffix = def.tier ? ` (${def.tier === 'bronze' ? '🥉' : def.tier === 'silver' ? '🥈' : '🥇'})` : ''
  createNotification({
    userId,
    type: 'achievement',
    title: `${def.icon} Achievement freigeschaltet!`,
    message: `${def.name}${tierSuffix}: ${def.description}`,
  }).catch(console.error)
  emitFeedEvent({ type: 'achievement', userId, metadata: { achievementKey: key } })

  // After every unlock, check achievements_collected tiers
  await checkAchievementsCollected(userId)
}

async function checkAchievementsCollected(userId: string): Promise<void> {
  const count = await unlockedAchievementCount(userId)
  const tiers: Array<{ key: AchievementKey; threshold: number }> = [
    { key: 'achievements_collected_bronze', threshold: 10 },
    { key: 'achievements_collected_silver', threshold: 20 },
    { key: 'achievements_collected_gold', threshold: 30 },
  ]
  for (const { key, threshold } of tiers) {
    if (count >= threshold) {
      const [existing] = await db
        .select({ id: userAchievements.id })
        .from(userAchievements)
        .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, key)))
        .limit(1)
      if (!existing && (await tryUnlock(userId, key))) {
        // Notify without re-triggering achievements_collected recursion
        const def = ACHIEVEMENTS[key]
        const tierSuffix = ` (🥉🥈🥇)`[(def.tier === 'bronze' ? 0 : def.tier === 'silver' ? 1 : 2)]
        createNotification({
          userId,
          type: 'achievement',
          title: `${def.icon} Achievement freigeschaltet!`,
          message: `${def.name} ${tierSuffix}: ${def.description}`,
        }).catch(console.error)
        emitFeedEvent({ type: 'achievement', userId, metadata: { achievementKey: key } })
      }
    }
  }
}

async function alreadyUnlocked(userId: string, key: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: userAchievements.id })
    .from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, key)))
    .limit(1)
  return !!existing
}

async function tryAward(userId: string, key: AchievementKey): Promise<void> {
  if (!(await alreadyUnlocked(userId, key)) && (await tryUnlock(userId, key))) {
    await notifyAchievement(userId, key)
  }
}

// ─── Rule handlers ────────────────────────────────────────────────────────────

async function handlePurchase(event: Extract<AchievementEvent, { type: 'purchase' }>): Promise<void> {
  const { userId, now, items, groupId } = event

  // ── Tiered: purchases ──────────────────────────────────────────────────────
  const pc = await purchaseCount(userId)
  if (pc >= 1) await tryAward(userId, 'purchases_bronze')
  if (pc >= 10) await tryAward(userId, 'purchases_silver')
  if (pc >= 100) await tryAward(userId, 'purchases_gold')

  // ── Category item counts ───────────────────────────────────────────────────
  const categoryCounts: Partial<Record<string, number>> = {}
  for (const item of items) {
    if (item.category) {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + item.quantity
    }
  }
  // Only query DB for categories that appear in this purchase
  const involvedCategories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[]
  for (const cat of involvedCategories) {
    const total = await categoryItemCount(userId, cat)
    if (cat === 'alcoholic') {
      if (total >= 100) await tryAward(userId, 'alcoholic_drinker_silver')
      if (total >= 1337) await tryAward(userId, 'alcoholic_drinker_gold')
    } else if (cat === 'soft_drink') {
      if (total >= 100) await tryAward(userId, 'softdrink_lover_silver')
      if (total >= 1337) await tryAward(userId, 'softdrink_lover_gold')
    } else if (cat === 'food') {
      if (total >= 100) await tryAward(userId, 'food_fan_silver')
      if (total >= 1337) await tryAward(userId, 'food_fan_gold')
    } else if (cat === 'snack') {
      if (total >= 100) await tryAward(userId, 'snack_king_silver')
      if (total >= 1337) await tryAward(userId, 'snack_king_gold')
    } else if (cat === 'other') {
      if (total >= 100) await tryAward(userId, 'misc_collector_silver')
      if (total >= 1337) await tryAward(userId, 'misc_collector_gold')
    }
  }

  // ── Balance-related: check for going negative ──────────────────────────────
  const [userRow] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId))
  if (userRow) {
    if (userRow.balance < -1000) await tryAward(userId, 'pleite')
    if (userRow.balance < -2000) await tryAward(userId, 'tief_verschuldet')
  }

  // ── Time-based ─────────────────────────────────────────────────────────────
  const berlinHour = getBerlinHour(now)
  const berlinMinute = getBerlinMinute(now)
  const berlinSecond = getBerlinSecond(now)
  const berlinWeekday = getBerlinWeekday(now)

  if (berlinHour >= 6 && berlinHour < 10) await tryAward(userId, 'fruher_vogel')
  if (berlinHour >= 4 && berlinHour < 6) await tryAward(userId, 'morgenrote')
  if (berlinHour >= 16 && berlinHour < 18) await tryAward(userId, 'happy_hour')
  if (berlinHour >= 12 && berlinHour < 13) await tryAward(userId, 'mittagspause')

  // Geisterstunde: within ±10 seconds of midnight
  const isNearMidnight =
    (berlinHour === 0 && berlinMinute === 0 && berlinSecond <= 10) ||
    (berlinHour === 23 && berlinMinute === 59 && berlinSecond >= 50)
  if (isNearMidnight) await tryAward(userId, 'geisterstunde')

  // Monday blues: more than 3 purchases on a Berlin Monday
  if (berlinWeekday === 1) {
    const bifiDay = getBiFiDay(now)
    const mondayCount = await purchasesOnBiFiDay(userId, bifiDay)
    if (mondayCount > 3) await tryAward(userId, 'monday_blues')
  }

  // ── Feierlaune ─────────────────────────────────────────────────────────────
  const berlin = toBerlin(now)
  const mm = berlin.getUTCMonth() + 1
  const dd = berlin.getUTCDate()
  const isHoliday = (mm === 12 && dd === 25) || (mm === 1 && dd === 1) || (mm === 10 && dd === 31)
  if (isHoliday) await tryAward(userId, 'feierlaune')

  // ── Pattern: shopper ───────────────────────────────────────────────────────
  const bifiDay = getBiFiDay(now)
  const dayCount = await purchasesOnBiFiDay(userId, bifiDay)
  if (dayCount >= 5) await tryAward(userId, 'shopper')

  // ── Pattern: die_runde_geht_auf_mich ──────────────────────────────────────
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  if (totalItems >= 5) await tryAward(userId, 'die_runde_geht_auf_mich')

  // ── Social: group-related ──────────────────────────────────────────────────
  if (groupId) {
    // party: first group purchase
    await tryAward(userId, 'party')

    // wein_buddy: group purchase with a wine item
    const hasWein = items.some((i) => i.buyableName.toLowerCase().includes('wein'))
    if (hasWein) await tryAward(userId, 'wein_buddy')
  }

  // ── Schnellfeuer ───────────────────────────────────────────────────────────
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const recentPurchases = await db
    .select({ createdAt: transactions.createdAt })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'purchase'),
        isNull(transactions.cancelledAt),
        gte(transactions.createdAt, oneHourAgo),
      ),
    )

  if (recentPurchases.length >= 3) {
    const sorted = recentPurchases.map((r) => r.createdAt.getTime()).sort((a, b) => a - b)
    let allGapsOk = true
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i]! - sorted[i - 1]!
      if (gap < 5 * 60 * 1000) {
        allGapsOk = false
        break
      }
    }
    if (allGapsOk) await tryAward(userId, 'schnellfeuer')
  }

  // ── Intervall-Trinker ──────────────────────────────────────────────────────
  const lastThree = await db
    .select({ createdAt: transactions.createdAt })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt)))
    .orderBy(sql`${transactions.createdAt} DESC`)
    .limit(3)

  if (lastThree.length === 3) {
    const times = lastThree.map((r) => r.createdAt.getTime()).sort((a, b) => a - b)
    const gap1 = times[1]! - times[0]!
    const gap2 = times[2]! - times[1]!
    if (Math.abs(gap1 - gap2) <= 60000) await tryAward(userId, 'intervall_trinker')
  }

  // ── Tägliches Ritual: 5 consecutive BiFi days ─────────────────────────────
  const allPurchases = await db
    .select({ createdAt: transactions.createdAt })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'purchase'), isNull(transactions.cancelledAt)))
    .orderBy(sql`${transactions.createdAt} DESC`)

  const distinctDays = [...new Set(allPurchases.map((r) => getBiFiDay(r.createdAt)))].sort().reverse()
  if (distinctDays.length >= 5) {
    // Check if the last 5 days form a streak ending today
    const todayBiFi = getBiFiDay(now)
    let streak = 0
    let current = todayBiFi
    for (let i = 0; i < Math.min(5, distinctDays.length); i++) {
      if (distinctDays[i] === current) {
        streak++
        // Go back one calendar day
        const prev = new Date(new Date(current).getTime() - 24 * 60 * 60 * 1000)
        current = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
      } else {
        break
      }
    }
    if (streak >= 5) await tryAward(userId, 'tagliches_ritual')
  }

  // ── Monats Streak: 4 consecutive ISO weeks ─────────────────────────────────
  const weekKeys = [
    ...new Set(allPurchases.map((r) => {
      const { year, week } = getISOWeek(r.createdAt)
      return `${year}-W${String(week).padStart(2, '0')}`
    })),
  ].sort().reverse()

  if (weekKeys.length >= 4) {
    const { year: curYear, week: curWeek } = getISOWeek(now)
    let weekStreak = 0
    let yr = curYear
    let wk = curWeek
    for (let i = 0; i < Math.min(4, weekKeys.length); i++) {
      const expected = `${yr}-W${String(wk).padStart(2, '0')}`
      if (weekKeys[i] === expected) {
        weekStreak++
        wk--
        if (wk === 0) {
          yr--
          wk = 52 // Approximate; edge case for 53-week years
        }
      } else {
        break
      }
    }
    if (weekStreak >= 4) await tryAward(userId, 'monats_streak')
  }

  // ── Weekend-Warrior ────────────────────────────────────────────────────────
  if (berlinWeekday === 6 || berlinWeekday === 7) {
    // Check if they've purchased on both days of this calendar weekend
    const berlinDate = toBerlin(now)
    const ddd = berlinDate.getUTCDay() // 0=Sun, 6=Sat
    // Find the Saturday of this week
    let satDate: Date
    let sunDate: Date
    if (ddd === 6) {
      satDate = berlinDate
      sunDate = new Date(berlinDate)
      sunDate.setUTCDate(sunDate.getUTCDate() + 1)
    } else {
      // Sunday
      sunDate = berlinDate
      satDate = new Date(berlinDate)
      satDate.setUTCDate(satDate.getUTCDate() - 1)
    }
    const satStr = `${satDate.getUTCFullYear()}-${String(satDate.getUTCMonth() + 1).padStart(2, '0')}-${String(satDate.getUTCDate()).padStart(2, '0')}`
    const sunStr = `${sunDate.getUTCFullYear()}-${String(sunDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sunDate.getUTCDate()).padStart(2, '0')}`
    const hasSat = allPurchases.some((r) => {
      const bd = toBerlin(r.createdAt)
      const ds = `${bd.getUTCFullYear()}-${String(bd.getUTCMonth() + 1).padStart(2, '0')}-${String(bd.getUTCDate()).padStart(2, '0')}`
      return ds === satStr
    })
    const hasSun = allPurchases.some((r) => {
      const bd = toBerlin(r.createdAt)
      const ds = `${bd.getUTCFullYear()}-${String(bd.getUTCMonth() + 1).padStart(2, '0')}-${String(bd.getUTCDate()).padStart(2, '0')}`
      return ds === sunStr
    })
    if (hasSat && hasSun) await tryAward(userId, 'weekend_warrior')
  }

  // ── Saisontrinker ──────────────────────────────────────────────────────────
  const seasons = new Set<string>()
  for (const r of allPurchases) {
    const bd = toBerlin(r.createdAt)
    const m = bd.getUTCMonth() + 1
    if (m >= 3 && m <= 5) seasons.add('spring')
    else if (m >= 6 && m <= 8) seasons.add('summer')
    else if (m >= 9 && m <= 11) seasons.add('autumn')
    else seasons.add('winter')
  }
  if (seasons.size >= 4) await tryAward(userId, 'saisontrinker')

  // ── Pünktlich-Pils: 5 BiFi-days in a row at the same time ─────────────────
  if (distinctDays.length >= 5) {
    // Get earliest purchase time per BiFi day
    const dayTimes: Map<string, number> = new Map()
    for (const r of allPurchases) {
      const day = getBiFiDay(r.createdAt)
      const berlin = toBerlin(r.createdAt)
      const mins = berlin.getUTCHours() * 60 + berlin.getUTCMinutes()
      if (!dayTimes.has(day) || mins < dayTimes.get(day)!) {
        dayTimes.set(day, mins)
      }
    }
    const lastFiveDays = distinctDays.slice(0, 5)
    const timesForLastFive = lastFiveDays.map((d) => dayTimes.get(d)).filter((t): t is number => t !== undefined)
    if (timesForLastFive.length === 5) {
      const minTime = Math.min(...timesForLastFive)
      const maxTime = Math.max(...timesForLastFive)
      if (maxTime - minTime <= 30) await tryAward(userId, 'pünktlich_pils')
    }
  }

  // ── Lucky Seven ─────────────────────────────────────────────────────────────
  const globalCount = await globalPurchaseCount()
  if (isAllSevens(globalCount)) await tryAward(userId, 'lucky_seven')
}

async function handleDeposit(event: Extract<AchievementEvent, { type: 'deposit' }>): Promise<void> {
  const { userId, amount, balanceBefore, balanceAfter } = event

  if (balanceAfter < -1000) await tryAward(userId, 'pleite')
  if (balanceAfter < -2000) await tryAward(userId, 'tief_verschuldet')
  if (balanceAfter > 0) await tryAward(userId, 'verantwortungsvoll')
  if (balanceBefore < 0 && balanceBefore + amount === 0) await tryAward(userId, 'passendes_kleingeld')
  if (amount >= 5000) await tryAward(userId, 'grosse_einzahlung')
  if (balanceAfter >= 10000) await tryAward(userId, 'dreistellig')
  if (balanceBefore < -2000 && balanceAfter > 2000) await tryAward(userId, 'finanz_phoenix')
  if (balanceBefore > 0) await tryAward(userId, 'ich_habs_ja')
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function checkAchievements(event: AchievementEvent): Promise<void> {
  const { userId } = event

  try {
    switch (event.type) {
      case 'purchase':
        await handlePurchase(event)
        break

      case 'prost_sent': {
        const psc = await prostSentCount(userId)
        if (psc >= 5) await tryAward(userId, 'prost_sent_bronze')
        if (psc >= 15) await tryAward(userId, 'prost_sent_silver')
        if (psc >= 30) await tryAward(userId, 'prost_sent_gold')
        break
      }

      case 'prost_received': {
        const prc = await prostReceivedCount(userId)
        if (prc >= 10) await tryAward(userId, 'prost_received_bronze')
        if (prc >= 25) await tryAward(userId, 'prost_received_silver')
        if (prc >= 50) await tryAward(userId, 'prost_received_gold')
        break
      }

      case 'contribution': {
        const dc = await donationCount(userId)
        if (dc >= 3) await tryAward(userId, 'donations_bronze')
        if (dc >= 10) await tryAward(userId, 'donations_silver')
        if (dc >= 25) await tryAward(userId, 'donations_gold')
        break
      }

      case 'group_founded':
        // party is awarded on first group purchase, not group creation
        // (group_founded kept for future standalone group-founder achievement)
        break

      case 'jackpot':
        await tryAward(userId, 'die_sonne_lacht')
        if (event.multiplier === 0) await tryAward(userId, 'gluckspilz')
        if (event.multiplier === 2) await tryAward(userId, 'pechvogel')
        break

      case 'deposit':
        await handleDeposit(event)
        break

      case 'friendship_accepted':
        // No specific achievement for friendship accepted yet
        break
    }
  } catch (err) {
    console.error(`Achievement check failed for event "${event.type}":`, err)
  }
}
