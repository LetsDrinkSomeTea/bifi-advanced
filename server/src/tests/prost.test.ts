import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import {
  createTestUser,
  createSession,
  getAuthCookie,
  createTestBuyable,
  createTestVariant,
} from './helpers.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

describe('Prost Endpoints', () => {
  it('should send a voucher and then automatically redeem it on purchase', async () => {
    const sender = await createTestUser({ balance: 1000 });
    const recipient = await createTestUser({ balance: 0 });
    const senderSession = await createSession(sender.id);
    const recipientSession = await createSession(recipient.id);

    const b = await createTestBuyable();
    const v = await createTestVariant(b.id, { price: 300 });

    // 1. Sender sends voucher to recipient
    const res1 = await app.request('/api/prost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: getAuthCookie(senderSession),
      },
      body: JSON.stringify({
        toUserId: recipient.id,
        variantId: v.id,
      }),
    });

    expect(res1.status).toBe(201);

    // Check sender balance
    const [updatedSender] = await db.select().from(users).where(eq(users.id, sender.id));
    if (!updatedSender) throw new Error('sender not found');
    expect(updatedSender.balance).toBe(700);

    // 2. Recipient lists vouchers
    const res2 = await app.request('/api/prost/vouchers', {
      headers: { Cookie: getAuthCookie(recipientSession) },
    });
    expect(res2.status).toBe(200);
    const vouchers = await res2.json();
    expect(vouchers.some((voc: any) => voc.fromUserId === sender.id)).toBe(true);

    // 3. Recipient buys the item
    const res3 = await app.request('/api/transactions/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: getAuthCookie(recipientSession),
      },
      body: JSON.stringify({
        items: [{ buyableId: b.id, variantId: v.id, quantity: 1 }],
      }),
    });

    expect(res3.status).toBe(201);
    const purchase = await res3.json();
    // Voucher covered 300, so net cost is 0
    expect(purchase.totalAmount).toBe(0);

    // Recipient balance should still be 0
    const [updatedRecipient] = await db.select().from(users).where(eq(users.id, recipient.id));
    if (!updatedRecipient) throw new Error('recipient not found');
    expect(updatedRecipient.balance).toBe(0);
  });
});
