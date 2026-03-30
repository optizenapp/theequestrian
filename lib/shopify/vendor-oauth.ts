/**
 * Dev Dashboard app OAuth (authorization code grant) for vendor stores.
 * @see https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
 */

import crypto from 'crypto';

const OAUTH_SCOPES = 'read_products,read_inventory,read_locations';

export function getVendorOAuthScopes(): string {
  return OAUTH_SCOPES;
}

/** HMAC for OAuth query string (not the same as webhook HMAC). */
export function verifyShopifyOAuthQueryHmac(
  searchParams: URLSearchParams,
  clientSecret: string
): boolean {
  const hmac = searchParams.get('hmac');
  if (!hmac) return false;

  const pairs: [string, string][] = [];
  searchParams.forEach((value, key) => {
    if (key === 'hmac' || key === 'signature') return;
    pairs.push([key, value]);
  });
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  const message = pairs.map(([k, v]) => `${k}=${v}`).join('&');
  const generated = crypto.createHmac('sha256', clientSecret).update(message).digest('hex');
  try {
    const a = Buffer.from(generated, 'utf8');
    const b = Buffer.from(hmac, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type OAuthStatePayload = {
  m: string;
  exp: number;
  n: string;
};

export function encodeOAuthState(
  marketplaceVendorName: string,
  clientSecret: string,
  ttlMs: number
): string {
  const payload: OAuthStatePayload = {
    m: marketplaceVendorName.trim(),
    exp: Date.now() + ttlMs,
    n: crypto.randomBytes(16).toString('hex'),
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', clientSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function decodeOAuthState(
  state: string,
  clientSecret: string
): OAuthStatePayload | null {
  const dot = state.indexOf('.');
  if (dot < 1) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = crypto.createHmac('sha256', clientSecret).update(body).digest('base64url');
  try {
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(body, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as OAuthStatePayload;
    if (!payload.m || typeof payload.exp !== 'number' || !payload.n) return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isValidShopHostname(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/i.test(shop.trim());
}

export async function exchangeAuthorizationCodeForToken(input: {
  shop: string;
  clientId: string;
  clientSecret: string;
  code: string;
}): Promise<{ access_token: string; scope?: string }> {
  const shop = input.shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url = `https://${shop}/admin/oauth/access_token`;
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OAuth token exchange ${response.status}: ${text.slice(0, 400)}`);
  }

  const data = JSON.parse(text) as { access_token?: string; scope?: string };
  if (!data.access_token) {
    throw new Error('OAuth response missing access_token');
  }
  return { access_token: data.access_token, scope: data.scope };
}

export function buildAuthorizeRedirectUrl(input: {
  shop: string;
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const shop = input.shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const params = new URLSearchParams({
    client_id: input.clientId,
    scope: OAUTH_SCOPES,
    redirect_uri: input.redirectUri,
    state: input.state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}
