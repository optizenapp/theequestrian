import { env } from '@/lib/env';
import { getGmcIntegration, saveGmcIntegration } from '@/lib/db/gmc';

const OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CONTENT_SCOPE = 'https://www.googleapis.com/auth/content';

function requireOAuthConfig() {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw new Error('Missing Google OAuth configuration.');
  }
}

export function buildGmcAuthUrl(state: string) {
  requireOAuthConfig();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: CONTENT_SCOPE,
    include_granted_scopes: 'true',
    state,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  requireOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI!,
    grant_type: 'authorization_code',
  });

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${errorText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }>;
}

async function refreshAccessToken(refreshToken: string) {
  requireOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
    grant_type: 'refresh_token',
  });

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh access token: ${errorText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  }>;
}

export async function getValidAccessToken(): Promise<string> {
  const integration = await getGmcIntegration();
  if (!integration?.access_token || !integration.refresh_token || !integration.token_expiry) {
    throw new Error('GMC integration is not connected.');
  }

  const expiry = new Date(integration.token_expiry).getTime();
  const now = Date.now();

  if (expiry - now > 60_000) {
    return integration.access_token;
  }

  const refreshed = await refreshAccessToken(integration.refresh_token);
  const tokenExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
  await saveGmcIntegration({
    accessToken: refreshed.access_token,
    tokenExpiry,
    scope: refreshed.scope ?? integration.scope,
  });

  return refreshed.access_token;
}
