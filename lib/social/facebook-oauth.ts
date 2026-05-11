const GRAPH_API_VERSION = 'v23.0';
const OAUTH_AUTHORIZE_URL = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`;
const OAUTH_TOKEN_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`;
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const FACEBOOK_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

type FacebookOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  configId: string;
};

function requireFacebookOAuthConfig(): FacebookOAuthConfig {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = process.env.FACEBOOK_OAUTH_REDIRECT_URI;
  const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID;
  if (!appId || !appSecret || !redirectUri || !configId) {
    throw new Error('Missing Facebook OAuth configuration');
  }
  return { appId, appSecret, redirectUri, configId };
}

export function buildFacebookAuthUrl(state: string): string {
  const config = requireFacebookOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state,
    config_id: config.configId,
    scope: FACEBOOK_SCOPES,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

type FacebookCodeTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

export async function exchangeFacebookCodeForToken(code: string): Promise<FacebookCodeTokenResponse> {
  const config = requireFacebookOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });
  const response = await fetch(`${OAUTH_TOKEN_URL}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange Facebook auth code: ${text}`);
  }
  return (await response.json()) as FacebookCodeTokenResponse;
}

type FacebookLongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

export async function exchangeForLongLivedFacebookToken(token: string): Promise<FacebookLongLivedTokenResponse> {
  const config = requireFacebookOAuthConfig();
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: token,
  });
  const response = await fetch(`${OAUTH_TOKEN_URL}?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange for long-lived Facebook token: ${text}`);
  }
  return (await response.json()) as FacebookLongLivedTokenResponse;
}

type FacebookPage = {
  id: string;
  name: string;
  access_token: string;
};

type FacebookPagesResponse = {
  data?: FacebookPage[];
};

export type ManagedPage = {
  id: string;
  name: string;
  accessToken: string;
};

export async function getManagedFacebookPages(userAccessToken: string): Promise<ManagedPage[]> {
  const url = new URL(`${GRAPH_API_BASE_URL}/me/accounts`);
  url.searchParams.set('fields', 'id,name,access_token');
  url.searchParams.set('access_token', userAccessToken);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load managed Facebook pages: ${text}`);
  }
  const payload = (await response.json()) as FacebookPagesResponse;
  return (payload.data ?? [])
    .filter((item) => item.id && item.name && item.access_token)
    .map((item) => ({ id: item.id, name: item.name, accessToken: item.access_token }));
}

type InstagramBusinessAccount = {
  id?: string;
  username?: string;
};

type FacebookPageDetailsResponse = {
  id?: string;
  name?: string;
  access_token?: string;
  instagram_business_account?: InstagramBusinessAccount;
};

export type LinkedInstagramAccount = {
  id: string;
  username: string | null;
};

export async function getLinkedInstagramAccount(
  pageId: string,
  pageAccessToken: string
): Promise<LinkedInstagramAccount | null> {
  const url = new URL(`${GRAPH_API_BASE_URL}/${encodeURIComponent(pageId)}`);
  url.searchParams.set('fields', 'instagram_business_account{id,username}');
  url.searchParams.set('access_token', pageAccessToken);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load linked Instagram account: ${text}`);
  }
  const payload = (await response.json()) as FacebookPageDetailsResponse;
  const account = payload.instagram_business_account;
  if (!account?.id) return null;
  return { id: account.id, username: account.username ?? null };
}

export type FacebookPageProfile = {
  id: string;
  name: string;
  accessToken: string | null;
};

export async function getFacebookPageProfile(pageId: string, accessToken: string): Promise<FacebookPageProfile> {
  const url = new URL(`${GRAPH_API_BASE_URL}/${encodeURIComponent(pageId)}`);
  url.searchParams.set('fields', 'id,name,access_token');
  url.searchParams.set('access_token', accessToken);
  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load Facebook page profile: ${text}`);
  }
  const payload = (await response.json()) as FacebookPageDetailsResponse;
  if (!payload.id || !payload.name) {
    throw new Error('Facebook page profile response missing id or name');
  }
  return { id: payload.id, name: payload.name, accessToken: payload.access_token ?? null };
}
