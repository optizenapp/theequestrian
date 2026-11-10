import { getCanonicalSiteUrl } from '@/lib/seo/site-url';

export type CustomerAccountConfig = {
  clientId: string;
  clientSecret: string | null;
  sessionSecret: string;
  discoveryHost: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
};

/** Sign-in stays off (routes 404) until the Customer Account API client and session secret are configured. */
export function getCustomerAccountConfig(): CustomerAccountConfig | null {
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();
  const sessionSecret = process.env.CUSTOMER_SESSION_SECRET?.trim();
  const discoveryHost = (process.env.SHOPIFY_CUSTOMER_ACCOUNT_DISCOVERY_HOST || process.env.SHOPIFY_STORE_DOMAIN || '').trim();
  if (!clientId || !sessionSecret || sessionSecret.length < 32 || !discoveryHost) return null;

  const siteUrl = getCanonicalSiteUrl();
  return {
    clientId,
    clientSecret: process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET?.trim() || null,
    sessionSecret,
    discoveryHost,
    redirectUri: `${siteUrl}/api/account/callback`,
    postLogoutRedirectUri: `${siteUrl}/`,
  };
}

/** Only same-site relative paths, so the sign-in flow can't be used as an open redirect. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/account';
  return value;
}
