import { describe, it, expect } from 'vitest';
import app from '../index.ts';
import { createTestUser, createSession, getAuthCookie, createTestGroup } from './helpers.ts';
import { db } from '../db/index.ts';
import { groupMembers } from '../db/schema.ts';
import { and, eq } from 'drizzle-orm';

describe('Groups Endpoints', () => {
  describe('POST /api/groups', () => {
    it('should create a new group and add creator as owner', async () => {
      const me = await createTestUser();
      const sessionId = await createSession(me.id);

      const res = await app.request('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({
          name: 'My New Group',
          description: 'A test group',
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('My New Group');
      expect(body.inviteCode).toBeDefined();

      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, body.id), eq(groupMembers.userId, me.id)));
      if (!membership) throw new Error('membership not found');
      expect(membership.role).toBe('owner');
    });
  });

  describe('POST /api/groups/join', () => {
    it('should allow joining a group via invite code', async () => {
      const owner = await createTestUser();
      const group = await createTestGroup(owner.id, {
        name: 'Invite Only',
        inviteCode: 'JOINME12',
      });

      const visitor = await createTestUser();
      const sessionId = await createSession(visitor.id);

      const res = await app.request('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: getAuthCookie(sessionId),
        },
        body: JSON.stringify({ inviteCode: 'JOINME12' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe(group.id);

      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, visitor.id)));
      expect(membership).toBeDefined();
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should return group details for a member', async () => {
      const owner = await createTestUser();
      const group = await createTestGroup(owner.id);
      const sessionId = await createSession(owner.id);

      const res = await app.request(`/api/groups/${group.id}`, {
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe(group.name);
      expect(Array.isArray(body.members)).toBe(true);
    });
  });

  describe('POST /api/groups/:id/leave', () => {
    it('should allow a member to leave a group', async () => {
      const owner = await createTestUser();
      const group = await createTestGroup(owner.id);
      const member = await createTestUser();
      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: member.id, role: 'member' });

      const sessionId = await createSession(member.id);
      const res = await app.request(`/api/groups/${group.id}/leave`, {
        method: 'POST',
        headers: { Cookie: getAuthCookie(sessionId) },
      });

      expect(res.status).toBe(204);

      const [membership] = await db
        .select()
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, member.id)));
      if (!membership) throw new Error('membership not found');
      // Check if it's either deleted or marked with leftAt
      // Migration 0007 added left_at column.
      expect(membership.leftAt).not.toBeNull();
    });
  });
});
