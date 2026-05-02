import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { buyables, buyableCategoryEnum, productVariants } from '../db/schema.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { writeAuditLog } from '../services/audit.ts';
import { getActiveDiscount, calculateDiscountedPrice } from '../services/promotions.ts';

const router = new Hono();

// ─── GET /api/buyables ────────────────────────────────────────────────────────

router.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const showAll =
    c.req.query('all') === 'true' && (user.role === 'admin' || user.role === 'moderator');

  const allBuyables = await db
    .select()
    .from(buyables)
    .where(showAll ? undefined : eq(buyables.isActive, true))
    .orderBy(buyables.sortOrder, buyables.name);

  const allVariants = await db
    .select()
    .from(productVariants)
    .where(showAll ? undefined : eq(productVariants.isActive, true))
    .orderBy(productVariants.sortOrder, productVariants.name);

  const result = await Promise.all(
    allBuyables.map(async (b) => {
      const variants = allVariants.filter((v) => v.buyableId === b.id);
      const variantsWithDiscounts = await Promise.all(
        variants.map(async (v) => {
          const discount = await getActiveDiscount(b.id, v.id, b.category);
          return {
            ...v,
            activeDiscount: discount,
            discountedPrice: calculateDiscountedPrice(v.price, discount),
          };
        }),
      );

      return {
        ...b,
        variants: variantsWithDiscounts,
      };
    }),
  );

  return c.json(result);
});

// ─── POST /api/buyables ───────────────────────────────────────────────────────

const BUYABLE_CATEGORIES = ['alcoholic', 'soft_drink', 'food', 'snack', 'other'] as const;

const CreateBuyableSchema = z.object({
  name: z.string().min(1).max(80),
  imageUrl: z.string().url().optional(),
  category: z.enum(BUYABLE_CATEGORIES).optional(),
  sortOrder: z.number().int().default(0),
  firstVariant: z.object({
    name: z.string().min(1).max(80),
    price: z.number().int().min(0),
  }),
});

router.post(
  '/',
  requireAuth,
  requireRole('moderator'),
  zValidator('json', CreateBuyableSchema),
  async (c) => {
    const body = c.req.valid('json');
    const actor = c.get('user');
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const { buyable: created, variant } = await db.transaction(async (tx) => {
      const [buyable] = await tx
        .insert(buyables)
        .values({
          name: body.name,
          imageUrl: body.imageUrl ?? null,
          category: body.category ?? null,
          sortOrder: body.sortOrder,
        })
        .returning();

      const [variant] = await tx
        .insert(productVariants)
        .values({
          buyableId: buyable!.id,
          name: body.firstVariant.name,
          price: body.firstVariant.price,
          sortOrder: 0,
        })
        .returning();

      return { buyable: buyable!, variant: variant! };
    });

    await writeAuditLog({
      actorId: actor.id,
      action: 'buyable.created',
      resourceType: 'buyable',
      resourceId: created.id,
      changes: { after: { ...created, firstVariant: variant } },
      ipAddress: ip,
    });

    return c.json({ ...created, variants: [variant] }, 201);
  },
);

// ─── PUT /api/buyables/:id ────────────────────────────────────────────────────

const UpdateBuyableSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  imageUrl: z.string().url().nullable().optional(),
  category: z.enum(BUYABLE_CATEGORIES).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.put(
  '/:id',
  requireAuth,
  requireRole('moderator'),
  zValidator('json', UpdateBuyableSchema),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid('json');
    const actor = c.get('user');

    const [before] = await db.select().from(buyables).where(eq(buyables.id, id));
    if (!before) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);

    const [updated] = await db
      .update(buyables)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(buyables.id, id))
      .returning();

    await writeAuditLog({
      actorId: actor.id,
      action: 'buyable.updated',
      resourceType: 'buyable',
      resourceId: id,
      changes: { before, after: updated },
      ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });

    return c.json(updated);
  },
);

// ─── DELETE /api/buyables/:id ─────────────────────────────────────────────────

router.delete('/:id', requireAuth, requireRole('admin'), async (c) => {
  const { id } = c.req.param();
  const actor = c.get('user');

  const [before] = await db.select().from(buyables).where(eq(buyables.id, id));
  if (!before) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);

  await db
    .update(buyables)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(buyables.id, id));

  await writeAuditLog({
    actorId: actor.id,
    action: 'buyable.deleted',
    resourceType: 'buyable',
    resourceId: id,
    changes: { before },
    ipAddress: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  });

  return c.body(null, 204);
});

// ─── POST /api/buyables/:id/variants ─────────────────────────────────────────

const CreateVariantSchema = z.object({
  name: z.string().min(1).max(80),
  price: z.number().int().min(0),
  sortOrder: z.number().int().default(0),
});

router.post(
  '/:id/variants',
  requireAuth,
  requireRole('moderator'),
  zValidator('json', CreateVariantSchema),
  async (c) => {
    const { id } = c.req.param();
    const body = c.req.valid('json');

    const [parent] = await db.select().from(buyables).where(eq(buyables.id, id));
    if (!parent?.isActive)
      return c.json({ error: 'Buyable not found', code: 'NOT_FOUND' }, 404);

    const [created] = await db
      .insert(productVariants)
      .values({
        buyableId: id,
        name: body.name,
        price: body.price,
        sortOrder: body.sortOrder,
      })
      .returning();

    return c.json(created, 201);
  },
);

// ─── PUT /api/buyables/:id/variants/:variantId ────────────────────────────────

const UpdateVariantSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  price: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.put(
  '/:id/variants/:variantId',
  requireAuth,
  requireRole('moderator'),
  zValidator('json', UpdateVariantSchema),
  async (c) => {
    const { variantId } = c.req.param();
    const body = c.req.valid('json');

    const [updated] = await db
      .update(productVariants)
      .set(body)
      .where(and(eq(productVariants.id, variantId)))
      .returning();

    if (!updated) return c.json({ error: 'Variant not found', code: 'NOT_FOUND' }, 404);

    return c.json(updated);
  },
);

export default router;
