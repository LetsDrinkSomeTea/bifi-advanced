import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { promotions } from '../db/schema.ts'
import { requireAuth } from '../middleware/auth.ts'
import { writeAuditLog } from '../services/audit.ts'
import { broadcastInvalidate } from '../services/notifications.ts'
import { emitFeedEvent } from '../services/feed.ts'

const router = new Hono()

// Only moderators and admins can access these routes
router.use('/*', requireAuth, async (c, next) => {
  const user = c.get('user')
  if (user.role === 'member') {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403)
  }
  await next()
})

const PromotionSchema = z.object({
  name: z.string().min(1).max(100),
  discountPercent: z.number().int().min(0).max(100).nullable().optional(),
  discountFixedCents: z.number().int().min(0).nullable().optional(),
  startTime: z.string().datetime().nullable().optional(),
  endTime: z.string().datetime().nullable().optional(),
  appliesTo: z.object({
    buyableId: z.string().uuid().optional(),
    variantId: z.string().uuid().optional(),
    categoryIds: z.array(z.string()).optional(),
  }).nullable().optional(),
  isActive: z.boolean().default(true),
})

router.get('/', async (c) => {
  const rows = await db.select().from(promotions).orderBy(desc(promotions.createdAt))
  return c.json(rows)
})

router.post('/', zValidator('json', PromotionSchema), async (c) => {
  const body = c.req.valid('json')
  const user = c.get('user')

  const [created] = await db.insert(promotions).values({
    ...body,
    startTime: body.startTime ? new Date(body.startTime) : null,
    endTime: body.endTime ? new Date(body.endTime) : null,
  }).returning()

  broadcastInvalidate(['buyables'])

  // Emit feed event if it's an immediate promotion
  if (!created!.startTime && created!.isActive) {
    emitFeedEvent({
        type: 'promotion_started',
        userId: user.id,
        metadata: { 
            promoName: created!.name,
            discountPercent: created!.discountPercent ?? undefined,
            discountFixedCents: created!.discountFixedCents ?? undefined
        }
    })
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'promotion.created',
    resourceType: 'promotion',
    resourceId: created!.id,
    changes: { after: created },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return c.json(created, 201)
})

router.patch('/:id', zValidator('json', PromotionSchema.partial()), async (c) => {
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const user = c.get('user')

  const [existing] = await db.select().from(promotions).where(eq(promotions.id, id))
  if (!existing) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  const [updated] = await db
    .update(promotions)
    .set({
      ...body,
      startTime: body.startTime === undefined ? existing.startTime : (body.startTime ? new Date(body.startTime) : null),
      endTime: body.endTime === undefined ? existing.endTime : (body.endTime ? new Date(body.endTime) : null),
    })
    .where(eq(promotions.id, id))
    .returning()

  broadcastInvalidate(['buyables'])

  // Emit feed event if isActive state changed AND it's not a scheduled promotion
  if (!updated!.startTime && body.isActive !== undefined && body.isActive !== existing.isActive) {
    if (body.isActive) {
      emitFeedEvent({
          type: 'promotion_started',
          userId: user.id,
          metadata: { 
              promoName: updated!.name,
              discountPercent: updated!.discountPercent ?? undefined,
              discountFixedCents: updated!.discountFixedCents ?? undefined
          }
      })
    } else {
      emitFeedEvent({
          type: 'promotion_ended',
          userId: user.id,
          metadata: { 
              promoName: updated!.name
          }
      })
    }
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'promotion.updated',
    resourceType: 'promotion',
    resourceId: id,
    changes: { before: existing, after: updated },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return c.json(updated)
})

router.delete('/:id', async (c) => {
  const { id } = c.req.param()
  const user = c.get('user')

  const [existing] = await db.select().from(promotions).where(eq(promotions.id, id))
  if (!existing) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404)

  await db.delete(promotions).where(eq(promotions.id, id))

  broadcastInvalidate(['buyables'])

  // Emit feed event if it was an active immediate promotion
  if (!existing.startTime && existing.isActive) {
    emitFeedEvent({
      type: 'promotion_ended',
      userId: user.id,
      metadata: { 
          promoName: existing.name
      }
    })
  }

  await writeAuditLog({
    actorId: user.id,
    action: 'promotion.deleted',
    resourceType: 'promotion',
    resourceId: id,
    changes: { before: existing },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return c.body(null, 204)
})

export default router
