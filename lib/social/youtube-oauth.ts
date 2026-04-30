const OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

function requireYoutubeOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing YouTube OAuth configuration');
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildYoutubeAuthUrl(state: string): string {
  const config = requireYoutubeOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: YOUTUBE_SCOPES,
    include_granted_scopes: 'true',
    state,
  });
  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export type YoutubeTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export async function exchangeYoutubeCodeForTokens(code: string): Promise<YoutubeTokenResponse> {
  const config = requireYoutubeOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange YouTube auth code: ${text}`);
  }
  return (await response.json()) as YoutubeTokenResponse;
}

export type YoutubeChannelProfile = {
  channelId: string;
  title: string;
};

type YoutubeChannelsListResponse = {
  items?: Array<{
    id?: string;
    snippet?: { title?: string };
  }>;
};

export async function getYoutubeChannelProfile(accessToken: string): Promise<YoutubeChannelProfile> {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('mine', 'true');
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read YouTube profile: ${text}`);
  }
  const payload = (await response.json()) as YoutubeChannelsListResponse;
  const first = payload.items?.[0];
  const channelId = first?.id?.trim();
  const title = first?.snippet?.title?.trim();
  if (!channelId || !title) {
    throw new Error('Connected Google account has no YouTube channel');
  }
  return { channelId, title };
}
