import { Hono } from 'hono';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { writeAuditLog } from '../services/audit.ts';
import {
  getOIDCConfig,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
} from '../services/oidc.ts';
import { linkSessionToUser, regenerateSession, unlinkSessionFromUser, invalidateSession } from '../middleware/session.ts';
import { requireAuth } from '../middleware/auth.ts';
import { SafeImageUrlSchema } from '../lib/url.ts';
import { getClientIp } from '../lib/ip.ts';

type RoleSyncMode = 'always' | 'on_creation' | 'never';

function getRoleSyncMode(): RoleSyncMode {
  const v = process.env.ROLE_SYNC ?? process.env.ROLE_SYNC_ENABLED;
  if (v === 'on_creation') return 'on_creation';
  if (v === 'never' || v === 'false') return 'never';
  return 'always';
}

const auth = new Hono();

const OIDCClaimsSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email(),
    preferred_username: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    picture: z.unknown().optional(),
  })
  .passthrough();

function normalizeOrigin(input: string | undefined): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function getAllowedRedirectOrigins(): Set<string> {
  const configured = (process.env.OIDC_ALLOWED_REDIRECT_ORIGINS ?? '')
    .split(',')
    .map((value) => normalizeOrigin(value.trim()))
    .filter((value): value is string => value !== null);

  const appOrigin = normalizeOrigin(process.env.APP_URL);
  if (appOrigin) configured.unshift(appOrigin);

  return new Set(configured);
}

auth.get('/config', (c) => {
  return c.json({
    oidcEnabled: !!(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && getOIDCConfig()),
    localEnabled: process.env.LOCAL_AUTH_ENABLED !== 'false',
    autoRedirect: process.env.OIDC_AUTO_REDIRECT === 'true',
    roleSync: getRoleSyncMode(),
    balanceWarnThreshold: parseInt(process.env.BALANCE_WARN_THRESHOLD ?? '-2000'),
  });
});

auth.get('/login', async (c) => {
  const config = getOIDCConfig();
  if (!config) {
    return c.json({ error: 'SSO not configured', code: 'OIDC_NOT_CONFIGURED' }, 503);
  }

  // Regenerate session ID to prevent fixation if a prior OIDC flow is in progress
  const session = await regenerateSession(c);
  const pkceVerifier = randomPKCECodeVerifier();
  const codeChallenge = await calculatePKCECodeChallenge(pkceVerifier);
  const state = randomBytes(32).toString('hex');

  session.oidcState = state;
  session.pkceVerifier = pkceVerifier;

  const allowedOrigins = getAllowedRedirectOrigins();
  const defaultOrigin = normalizeOrigin(process.env.APP_URL);
  if (defaultOrigin === null) {
    return c.json({ error: 'APP_URL must be a valid absolute URL', code: 'APP_URL_INVALID' }, 500);
  }
  const refererOrigin = normalizeOrigin(c.req.header('referer'));
  const publicOrigin =
    refererOrigin !== null && allowedOrigins.has(refererOrigin) ? refererOrigin : defaultOrigin;

  const redirectUri = `${publicOrigin}/api/auth/callback`;
  session.oidcRedirectUri = redirectUri;

  const url = buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: 'openid profile email groups',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
  });

  return c.redirect(url.href);
});

auth.get('/callback', async (c) => {
  const config = getOIDCConfig();
  if (!config) {
    return c.redirect('/login?error=oidc_not_configured');
  }

  const session = c.get('session');

  if (!session.oidcState || !session.pkceVerifier) {
    return c.redirect('/login?error=invalid_state');
  }

  // Use the redirect URI stored during /login so it matches what was sent to the provider.
  // c.req.url is absolute (backend-internal), so extract only path+search and resolve
  // against the public-facing base URL to get the correct redirect_uri for token exchange.
  const redirectBase =
    session.oidcRedirectUri ??
    `${process.env.APP_URL ?? 'http://localhost:3000'}/api/auth/callback`;
  const { pathname, search } = new URL(c.req.url);
  const callbackUrl = new URL(pathname + search, redirectBase);

  let tokens;
  try {
    tokens = await authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: session.pkceVerifier,
      expectedState: session.oidcState,
    });
  } catch (err) {
    console.error('OIDC token exchange failed:', err);
    return c.redirect('/login?error=auth_failed');
  }

  const rawClaims = tokens.claims();
  if (!rawClaims) {
    return c.redirect('/login?error=no_claims');
  }
  const parsedClaims = OIDCClaimsSchema.safeParse(rawClaims);
  if (!parsedClaims.success) {
    return c.redirect('/login?error=no_claims');
  }
  const claims = parsedClaims.data;

  const sub = claims.sub;
  const email = claims.email;
  const displayName = claims.preferred_username ?? claims.name ?? email;
  const avatarUrl =
    typeof claims.picture === 'string' && SafeImageUrlSchema.safeParse(claims.picture).success
      ? claims.picture
      : null;
  const groupsClaim = process.env.OIDC_GROUPS_CLAIM ?? 'groups';
  const groupsRaw = claims[groupsClaim];
  const groupsParsed = z.array(z.string()).safeParse(groupsRaw);
  if (!groupsParsed.success && groupsRaw !== undefined) {
    return c.redirect('/login?error=no_claims');
  }
  const groups = groupsParsed.success ? groupsParsed.data : [];
  const ip = getClientIp(c);

  const adminGroup = process.env.OIDC_ADMIN_GROUP;
  const moderatorGroup = process.env.OIDC_MODERATOR_GROUP;

  let role: 'admin' | 'moderator' | 'member' = 'member';
  if (adminGroup && groups.includes(adminGroup)) role = 'admin';
  else if (moderatorGroup && groups.includes(moderatorGroup)) role = 'moderator';

  const roleSyncMode = getRoleSyncMode();

  const [existing] = await db.select().from(users).where(eq(users.ssoClaim, sub));

  let userId: string;

  if (existing) {
    if (!existing.isActive) {
      return c.redirect('/login?error=auth_failed');
    }

    const [updated] = await db
      .update(users)
      .set({
        email,
        displayName,
        avatarUrl,
        updatedAt: new Date(),
        ...(roleSyncMode === 'always' ? { role } : {}),
      })
      .where(eq(users.id, existing.id))
      .returning();

    if (!updated) {
      return c.redirect('/login?error=update_failed');
    }
    userId = updated.id;
  } else {
    const initialRole = roleSyncMode !== 'never' ? role : 'member';
    const [created] = await db
      .insert(users)
      .values({ ssoClaim: sub, email, displayName, avatarUrl, role: initialRole })
      .returning();

    if (!created) {
      return c.redirect('/login?error=creation_failed');
    }
    userId = created.id;

    await writeAuditLog({
      actorId: created.id,
      action: 'user.created',
      resourceType: 'user',
      resourceId: created.id,
      resourceName: displayName,
      changes: { after: { id: created.id, email, role, via: 'oidc' } },
      ipAddress: ip,
    });
  }

  const freshSession = await regenerateSession(c);
  freshSession.userId = userId;
  await linkSessionToUser(c.get('sessionId'), userId);

  return c.redirect('/');
});

auth.post('/logout', async (c) => {
  const session = c.get('session');
  const userId = session.userId;
  const sessionId = c.get('sessionId');
  delete session.userId;
  delete session.oidcState;
  delete session.pkceVerifier;
  delete session.oidcRedirectUri;
  if (userId) {
    await unlinkSessionFromUser(sessionId, userId);
  }
  await invalidateSession(sessionId);
  return c.json({ success: true });
});

auth.get('/me', requireAuth, (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role,
    balance: user.balance,
    jackpotAllowed: user.jackpotAllowed,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
});

export default auth;
