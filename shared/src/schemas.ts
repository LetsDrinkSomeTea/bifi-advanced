import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LocalLoginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
})

export const CreateLocalUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32).regex(/^[a-z0-9_-]+$/i).optional(),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8),
  role: z.enum(['admin', 'moderator', 'member']).default('member'),
})

// ─── User ─────────────────────────────────────────────────────────────────────

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['admin', 'moderator', 'member']),
  balance: z.number().int(),
  jackpotAllowed: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

// ─── Buyables ─────────────────────────────────────────────────────────────────

export const CreateBuyableSchema = z.object({
  name: z.string().min(1).max(80),
  imageUrl: z.string().url().optional(),
  category: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
  firstVariant: z.object({
    name: z.string().min(1).max(80),
    price: z.number().int().min(0),
  }),
})

export const CreateVariantSchema = z.object({
  name: z.string().min(1).max(80),
  price: z.number().int().min(0),
  sortOrder: z.number().int().default(0),
})

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
})

export const ProstSchema = z.object({
  recipientId: z.string().uuid(),
  buyableId: z.string().uuid(),
  variantId: z.string().uuid(),
  note: z.string().max(200).optional(),
})

export const DepositSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(1),
  note: z.string().max(200).optional(),
})

// ─── Groups ───────────────────────────────────────────────────────────────────

export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
})

export const JoinGroupSchema = z.object({
  inviteCode: z.string().min(1),
})

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
})

// ─── Donation Goals ───────────────────────────────────────────────────────────

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  targetAmount: z.number().int().min(1),
  reward: z.string().max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const ContributeSchema = z.object({
  amount: z.number().int().min(1),
})

// ─── Nudges ───────────────────────────────────────────────────────────────────

export const NudgeSchema = z.object({
  recipientId: z.string().uuid(),
})

// ─── Admin ────────────────────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  role: z.enum(['admin', 'moderator', 'member']).optional(),
  isActive: z.boolean().optional(),
  jackpotAllowed: z.boolean().optional(),
  displayName: z.string().min(1).max(80).optional(),
})

export const BroadcastSchema = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(500),
})

// ─── Jackpot ──────────────────────────────────────────────────────────────────

export const JackpotSpinSchema = z.object({
  buyableId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
})

// ─── Pagination ───────────────────────────────────────────────────────────────

export const CursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
