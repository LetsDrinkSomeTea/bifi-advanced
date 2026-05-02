import {
  discovery,
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
} from 'openid-client';

type OIDCConfig = Awaited<ReturnType<typeof discovery>>;

let oidcConfig: OIDCConfig | null = null;

export async function initOIDC(): Promise<void> {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;

  if (!issuer || !clientId) {
    console.warn('OIDC_ISSUER or OIDC_CLIENT_ID not set — SSO login disabled');
    return;
  }

  oidcConfig = await discovery(new URL(issuer), clientId, process.env.OIDC_CLIENT_SECRET);

  console.log('OIDC discovery complete');
}

export function getOIDCConfig(): OIDCConfig | null {
  return oidcConfig;
}

export {
  buildAuthorizationUrl,
  authorizationCodeGrant,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
};
