import { Hono } from 'hono';
import { randomBytes } from 'crypto';
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
import { linkSessionToUser, regenerateSession } from '../middleware/session.ts';
import { requireAuth } from '../middleware/auth.ts';

type RoleSyncMode = 'always' | 'on_creation' | 'never';

function getRoleSyncMode(): RoleSyncMode {
  const v = process.env.ROLE_SYNC ?? process.env.ROLE_SYNC_ENABLED;
  if (v === 'on_creation') return 'on_creation';
  if (v === 'never' || v === 'false') return 'never';
  return 'always';
}

const auth = new Hono();

auth.get('/config', (c) => {
  return c.json({
    oidcEnabled: !!(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && getOIDCConfig()),
    localEnabled: process.env.LOCAL_AUTH_ENABLED !== 'false',
    autoRedirect: process.env.OIDC_AUTO_REDIRECT === 'true',
    roleSync: getRoleSyncMode(),
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

  // Derive the public-facing origin from the Referer header so the redirect URI
  // matches what the browser actually sees (e.g. when Vite proxies on a LAN IP).
  const referer = c.req.header('referer');
  const publicOrigin = (() => {
    if (referer) {
      try {
        const u = new URL(referer);
        return `${u.protocol}//${u.host}`;
      } catch {
        /* invalid referer, ignore */
      }
    }
    return process.env.APP_URL ?? 'http://localhost:3000';
  })();

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
  const sessionId = c.get('sessionId');

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

  const claims = tokens.claims();
  if (!claims) {
    return c.redirect('/login?error=no_claims');
  }

  const sub = claims.sub;
  const email = (claims.email as string | undefined) ?? '';
  const displayName =
    (claims.preferred_username as string | undefined) ??
    (claims.name as string | undefined) ??
    email;
  const avatarUrl = (claims.picture as string | undefined) ?? null;
  const groupsClaim = process.env.OIDC_GROUPS_CLAIM ?? 'groups';
  const groups = (claims[groupsClaim] as string[] | undefined) ?? [];
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? null;

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
      return c.redirect('/login?error=deactivated');
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
      changes: { after: { id: created.id, email, role, via: 'oidc' } },
      ipAddress: ip,
    });
  }

  delete session.oidcState;
  delete session.pkceVerifier;
  delete session.oidcRedirectUri;
  session.userId = userId;

  await linkSessionToUser(sessionId, userId);

  return c.redirect('/');
});

auth.post('/logout', (c) => {
  const session = c.get('session');
  delete session.userId;
  delete session.oidcState;
  delete session.pkceVerifier;
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
