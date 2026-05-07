import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROLES = ['admin', 'moderator', 'member'] as const;
export const AUDIT_SEVERITIES = ['info', 'low', 'medium', 'high'] as const;
export const TRANSACTION_TYPES = ['purchase', 'deposit', 'correction', 'jackpot', 'prost'] as const;
export const NUDGE_TYPES = ['nudge', 'prost'] as const;
export const NOTIFICATION_TYPES = [
  'nudge',
  'prost',
  'achievement',
  'deposit',
  'balance_warning',
  'friend_request',
  'system',
] as const;
export const BUYABLE_CATEGORIES = ['alcoholic', 'soft_drink', 'food', 'snack', 'other'] as const;
export const FRIENDSHIP_STATUSES = ['pending', 'accepted'] as const;
export const GROUP_ROLES = ['owner', 'member'] as const;
export const FEED_TYPES = [
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
  'jackpot_win',
  'promotion_started',
  'promotion_ended',
] as const;

export type BuyableCategory = (typeof BUYABLE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<BuyableCategory, string> = {
  alcoholic: 'Alkoholische Getränke',
  soft_drink: 'Softdrink',
  food: 'Essen',
  snack: 'Snacks',
  other: 'Sonstiges',
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LocalLoginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const CreateLocalUserSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9_-]+$/i)
    .optional(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
  role: z.enum(ROLES).default('member'),
});

// ─── User ─────────────────────────────────────────────────────────────────────

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(ROLES),
  balance: z.number().int(),
  jackpotAllowed: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export const CreateBuyableSchema = z.object({
  name: z.string().min(1).max(80),
  category: z.enum(BUYABLE_CATEGORIES).optional(),
  sortOrder: z.number().int().default(0),
  firstVariant: z.object({
    name: z.string().min(1).max(80),
    price: z.number().int().min(0),
  }),
});

export const CreateVariantSchema = z.object({
  name: z.string().min(1).max(80),
  price: z.number().int().min(0),
  sortOrder: z.number().int().default(0),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const PurchaseSchema = z.object({
  items: z
    .array(
      z.object({
        buyableId: z.string().uuid(),
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
  groupId: z.string().uuid().optional(),
  note: z.string().max(200).optional(),
});

export const ProstSchema = z.object({
  recipientId: z.string().uuid(),
  buyableId: z.string().uuid(),
  variantId: z.string().uuid(),
  note: z.string().max(200).optional(),
});

export const DepositSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1),
  note: z.string().max(200).optional(),
});

// ─── Groups ───────────────────────────────────────────────────────────────────

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});

export const JoinGroupSchema = z.object({
  inviteCode: z.string().min(1),
});

// ─── Promotions ───────────────────────────────────────────────────────────────

export const CreatePromotionSchema = z.object({
  name: z.string().min(1).max(80),
  discountPercent: z.number().int().min(1).max(100),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  appliesTo: z
    .object({
      categoryIds: z.array(z.string()).optional(),
      buyableIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
});

// ─── Nudges ───────────────────────────────────────────────────────────────────

export const NudgeSchema = z.object({
  recipientId: z.string().uuid(),
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  jackpotAllowed: z.boolean().optional(),
  displayName: z.string().min(1).max(80).optional(),
});

export const BroadcastSchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(500),
});

// ─── Jackpot ──────────────────────────────────────────────────────────────────

export const JackpotSpinSchema = z.object({
  buyableId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
});

// ─── Pagination ───────────────────────────────────────────────────────────────

export const CursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
