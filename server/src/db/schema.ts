import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  numeric,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['admin', 'moderator', 'member'])
export const transactionTypeEnum = pgEnum('transaction_type', [
  'purchase',
  'deposit',
  'correction',
  'jackpot',
  'prost',
])
export const nudgeTypeEnum = pgEnum('nudge_type', ['nudge', 'prost'])
export const notificationTypeEnum = pgEnum('notification_type', [
  'nudge',
  'prost',
  'achievement',
  'deposit',
  'goal_reached',
  'balance_warning',
  'friend_request',
  'system',
])

export const buyableCategoryEnum = pgEnum('buyable_category', ['alcoholic', 'soft_drink', 'food', 'snack', 'other'])
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted'])
export const groupRoleEnum = pgEnum('group_role', ['owner', 'member'])
export const feedTypeEnum = pgEnum('feed_type', [
  'purchase',
  'achievement',
  'group_join',
  'group_created',
  'group_left',
  'group_deleted',
  'nudge',
  'prost_sent',
  'prost_received',
  'friendship_started',
  'goal_reached',
  'jackpot_win',
  'promotion_started',
  'promotion_ended',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

const id = () => uuid('id').primaryKey().default(sql`gen_random_uuid()`)
const createdAt = () => timestamp('created_at').notNull().defaultNow()
const updatedAt = () => timestamp('updated_at').notNull().defaultNow()

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: id(),
  ssoClaim: text('sso_claim').unique(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: roleEnum('role').notNull().default('member'),
  balance: integer('balance').notNull().default(0),
  jackpotAllowed: boolean('jackpot_allowed').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const buyables = pgTable('buyables', {
  id: id(),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  category: buyableCategoryEnum('category'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const productVariants = pgTable('product_variants', {
  id: id(),
  buyableId: uuid('buyable_id')
    .notNull()
    .references(() => buyables.id),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: createdAt(),
})

export const groups = pgTable('groups', {
  id: id(),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  inviteCode: text('invite_code').unique(),
  maxMembers: integer('max_members').notNull().default(10),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
})

export const transactions = pgTable('transactions', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  initiatedBy: uuid('initiated_by')
    .notNull()
    .references(() => users.id),
  type: transactionTypeEnum('type').notNull(),
  totalAmount: integer('total_amount').notNull(),
  groupId: uuid('group_id').references(() => groups.id),
  note: text('note'),
  cancelledAt: timestamp('cancelled_at'),
  cancelledBy: uuid('cancelled_by').references(() => users.id),
  jackpotMultiplier: numeric('jackpot_multiplier', { precision: 4, scale: 2 }),
  createdAt: createdAt(),
})

export const transactionItems = pgTable('transaction_items', {
  id: id(),
  transactionId: uuid('transaction_id')
    .notNull()
    .references(() => transactions.id),
  buyableId: uuid('buyable_id')
    .notNull()
    .references(() => buyables.id),
  variantId: uuid('variant_id').references(() => productVariants.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  totalPrice: integer('total_price').notNull(),
  discountSavedCents: integer('discount_saved_cents').notNull().default(0),
})

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: groupRoleEnum('role').notNull().default('member'),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    leftAt: timestamp('left_at'),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
)

export const auditLogs = pgTable('audit_logs', {
  id: id(),
  actorId: uuid('actor_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id'),
  changes: jsonb('changes'),
  ipAddress: text('ip_address'),
  createdAt: createdAt(),
})

export const notifications = pgTable('notifications', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  readAt: timestamp('read_at'),
  relatedId: uuid('related_id'),
  createdAt: createdAt(),
})

export const nudges = pgTable('nudges', {
  id: id(),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => users.id),
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id),
  type: nudgeTypeEnum('type').notNull(),
  message: text('message').notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  transactionId: uuid('transaction_id').references(() => transactions.id),
  createdAt: createdAt(),
})

export const userAchievements = pgTable(
  'user_achievements',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    achievementKey: text('achievement_key').notNull(),
    unlockedAt: timestamp('unlocked_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.achievementKey)],
)

export const promotions = pgTable('promotions', {
  id: id(),
  name: text('name').notNull(),
  discountPercent: integer('discount_percent'),
  discountFixedCents: integer('discount_fixed_cents'),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  appliesTo: jsonb('applies_to'),
  isActive: boolean('is_active').notNull().default(true),
  quantityLimit: integer('quantity_limit'),
  quantityUsed: integer('quantity_used').notNull().default(0),
  createdAt: createdAt(),
})

export const donationGoals = pgTable('donation_goals', {
  id: id(),
  title: text('title').notNull(),
  description: text('description'),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull().default(0),
  reward: text('reward'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  completedAt: timestamp('completed_at'),
  createdAt: createdAt(),
})

export const donationContributions = pgTable('donation_contributions', {
  id: id(),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => donationGoals.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  amount: integer('amount').notNull(),
  createdAt: createdAt(),
})

export const activityFeed = pgTable('activity_feed', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  type: feedTypeEnum('type').notNull(),
  targetUserId: uuid('target_user_id').references(() => users.id),
  targetGroupId: uuid('target_group_id').references(() => groups.id),
  metadata: jsonb('metadata'),
  createdAt: createdAt(),
})

export const userFriendships = pgTable(
  'user_friendships',
  {
    id: id(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id),
    status: friendshipStatusEnum('status').notNull().default('pending'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.requesterId, t.addresseeId)],
)

export const prostVouchers = pgTable('prost_vouchers', {
  id: id(),
  fromUserId: uuid('from_user_id')
    .notNull()
    .references(() => users.id),
  toUserId: uuid('to_user_id')
    .notNull()
    .references(() => users.id),
  variantId: uuid('variant_id')
    .notNull()
    .references(() => productVariants.id),
  amount: integer('amount').notNull(),
  fromTransactionId: uuid('from_transaction_id').references(() => transactions.id),
  redeemedTransactionId: uuid('redeemed_transaction_id').references(() => transactions.id),
  redeemedAt: timestamp('redeemed_at'),
  creditedAt: timestamp('credited_at'),
  createdAt: createdAt(),
})

export const userFavorites = pgTable(
  'user_favorites',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.variantId] })],
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Buyable = typeof buyables.$inferSelect
export type Transaction = typeof transactions.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
export type Notification = typeof notifications.$inferSelect
