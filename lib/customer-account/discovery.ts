import type { CustomerAccountConfig } from './config';

export type CustomerAccountEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  endSessionEndpoint: string | null;
  graphqlApi: string;
};

const TTL_MS = 60 * 60 * 1000;
let cached: { host: string; endpoints: CustomerAccountEndpoints; fetchedAt: number } | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Discovery request failed (${response.status}) for ${url}`);
  return (await response.json()) as T;
}

/** Endpoints are discovered per shop rather than hardcoded, as Shopify recommends. */
export async function getCustomerAccountEndpoints(config: CustomerAccountConfig): Promise<CustomerAccountEndpoints> {
  if (cached && cached.host === config.discoveryHost && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.endpoints;
  }
  const base = `https://${config.discoveryHost}`;
  const [openid, api] = await Promise.all([
    fetchJson<{ authorization_endpoint?: string; token_endpoint?: string; end_session_endpoint?: string }>(
      `${base}/.well-known/openid-configuration`
    ),
    fetchJson<{ graphql_api?: string }>(`${base}/.well-known/customer-account-api`),
  ]);
  if (!openid.authorization_endpoint || !openid.token_endpoint || !api.graphql_api) {
    throw new Error('Customer Account discovery response is missing required endpoints');
  }
  const endpoints: CustomerAccountEndpoints = {
    authorizationEndpoint: openid.authorization_endpoint,
    tokenEndpoint: openid.token_endpoint,
    endSessionEndpoint: openid.end_session_endpoint ?? null,
    graphqlApi: api.graphql_api,
  };
  cached = { host: config.discoveryHost, endpoints, fetchedAt: Date.now() };
  return endpoints;
}
