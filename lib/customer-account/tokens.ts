import type { CustomerAccountConfig } from './config';
import type { CustomerAccountEndpoints } from './discovery';
import type { CustomerSession } from './session';

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
};

async function requestTokens(
  config: CustomerAccountConfig,
  endpoints: CustomerAccountEndpoints,
  params: Record<string, string>,
  previousIdToken: string | null
): Promise<CustomerSession> {
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (config.clientSecret) {
    headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
  }
  const response = await fetch(endpoints.tokenEndpoint, {
    method: 'POST',
    headers,
    body: new URLSearchParams({ client_id: config.clientId, ...params }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Customer Account token request failed (${response.status})`);
  }
  const data = (await response.json()) as TokenResponse;
  if (!data.access_token || !data.expires_in) {
    throw new Error('Customer Account token response is missing access_token or expires_in');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? params.refresh_token ?? null,
    idToken: data.id_token ?? previousIdToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export function exchangeAuthorizationCode(
  config: CustomerAccountConfig,
  endpoints: CustomerAccountEndpoints,
  code: string,
  verifier: string
): Promise<CustomerSession> {
  return requestTokens(
    config,
    endpoints,
    { grant_type: 'authorization_code', redirect_uri: config.redirectUri, code, code_verifier: verifier },
    null
  );
}

export function refreshCustomerSession(
  config: CustomerAccountConfig,
  endpoints: CustomerAccountEndpoints,
  session: CustomerSession
): Promise<CustomerSession> {
  if (!session.refreshToken) throw new Error('Customer session has no refresh token');
  return requestTokens(config, endpoints, { grant_type: 'refresh_token', refresh_token: session.refreshToken }, session.idToken);
}

/** The id_token comes straight from the token endpoint over TLS; only the nonce needs checking. */
export function idTokenNonceMatches(idToken: string | null, expectedNonce: string): boolean {
  if (!idToken) return false;
  const payload = idToken.split('.')[1];
  if (!payload) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { nonce?: string };
    return claims.nonce === expectedNonce;
  } catch {
    return false;
  }
}
