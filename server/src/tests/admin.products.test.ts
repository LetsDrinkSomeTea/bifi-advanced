import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie } from './helpers.ts';
import { db } from '../db/index.ts';
import { productVariants } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

describe('Admin Product Management', () => {
  it('should allow moderator to manage products', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const sessionId = await createSession(admin.id);

    // 1. Create a product
    const res1 = await app.request('/api/buyables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: getAuthCookie(sessionId),
      },
      body: JSON.stringify({
        name: 'New Beer',
        category: 'alcoholic',
        firstVariant: { name: '0.5l', price: 250 },
      }),
    });

    expect(res1.status).toBe(201);
    const product = await res1.json();
    expect(product.name).toBe('New Beer');
    expect(product.variants[0].price).toBe(250);

    // 2. Update product
    const res2 = await app.request(`/api/buyables/${product.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: getAuthCookie(sessionId),
      },
      body: JSON.stringify({ name: 'Premium Beer' }),
    });
    expect(res2.status).toBe(200);

    // 3. Add variant
    const res3 = await app.request(`/api/buyables/${product.id}/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: getAuthCookie(sessionId),
      },
      body: JSON.stringify({ name: '0.33l', price: 180 }),
    });
    expect(res3.status).toBe(201);

    // 4. Update variant
    const variantId = (await res3.json()).id;
    const res4 = await app.request(`/api/buyables/${product.id}/variants/${variantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: getAuthCookie(sessionId),
      },
      body: JSON.stringify({ price: 190 }),
    });
    expect(res4.status).toBe(200);

    // Verify in DB
    const [finalVariant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variantId));
    if (!finalVariant) throw new Error('variant not found');
    expect(finalVariant.price).toBe(190);
  });
});
