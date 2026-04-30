import crypto from 'node:crypto';
import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export type SocialChannel = 'youtube' | 'instagram' | 'twitter' | 'facebook';

export type SocialCredentialRow = {
  channel: SocialChannel;
  accountLabel: string | null;
  externalAccountId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string | null;
  metadata: Record<string, unknown>;
};

type SaveCredentialInput = {
  channel: SocialChannel;
  accountLabel?: string | null;
  externalAccountId?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scopes?: string | null;
  metadata?: Record<string, unknown>;
};

function getEncryptionKeyBuffer(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_ENC_KEY;
  if (!raw) {
    throw new Error('Missing SOCIAL_TOKEN_ENC_KEY');
  }
  const normalized = raw.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('SOCIAL_TOKEN_ENC_KEY must be 64 hex characters');
  }
  return Buffer.from(normalized, 'hex');
}

export function encryptToken(token: string): string {
  const key = getEncryptionKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptToken(payload: string): string {
  const key = getEncryptionKeyBuffer();
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted token payload');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function mapRow(row: Record<string, unknown>): SocialCredentialRow {
  return {
    channel: String(row.channel) as SocialChannel,
    accountLabel: row.account_label ? String(row.account_label) : null,
    externalAccountId: row.external_account_id ? String(row.external_account_id) : null,
    accessToken: row.access_token ? String(row.access_token) : null,
    refreshToken: row.refresh_token ? String(row.refresh_token) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    scopes: row.scopes ? String(row.scopes) : null,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

export async function getSocialCredential(channel: SocialChannel): Promise<SocialCredentialRow | null> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT channel, account_label, external_account_id, access_token, refresh_token, expires_at, scopes, metadata
      FROM social_channel_credentials
      WHERE channel = ${channel}
      LIMIT 1
    `;
    const row = result.rows[0];
    if (!row) return null;
    return mapRow(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown credentials load error';
    throw new Error(`Failed to load social credential: ${message}`);
  }
}

export async function saveSocialCredential(input: SaveCredentialInput): Promise<void> {
  try {
    await ensureEmailPlatformSchema();
    const encryptedRefreshToken = input.refreshToken ? encryptToken(input.refreshToken) : null;
    const metadata = input.metadata ?? {};
    const expiresAt = input.expiresAt ? input.expiresAt.toISOString() : null;
    await sql`
      INSERT INTO social_channel_credentials (
        channel, account_label, external_account_id, access_token, refresh_token, expires_at, scopes, metadata, updated_at
      )
      VALUES (
        ${input.channel},
        ${input.accountLabel ?? null},
        ${input.externalAccountId ?? null},
        ${input.accessToken ?? null},
        ${encryptedRefreshToken},
        ${expiresAt},
        ${input.scopes ?? null},
        ${JSON.stringify(metadata)}::jsonb,
        NOW()
      )
      ON CONFLICT (channel) DO UPDATE
      SET account_label = COALESCE(EXCLUDED.account_label, social_channel_credentials.account_label),
          external_account_id = COALESCE(EXCLUDED.external_account_id, social_channel_credentials.external_account_id),
          access_token = COALESCE(EXCLUDED.access_token, social_channel_credentials.access_token),
          refresh_token = COALESCE(EXCLUDED.refresh_token, social_channel_credentials.refresh_token),
          expires_at = COALESCE(EXCLUDED.expires_at, social_channel_credentials.expires_at),
          scopes = COALESCE(EXCLUDED.scopes, social_channel_credentials.scopes),
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown credentials save error';
    throw new Error(`Failed to save social credential: ${message}`);
  }
}

export async function deleteSocialCredential(channel: SocialChannel): Promise<void> {
  try {
    await ensureEmailPlatformSchema();
    await sql`
      DELETE FROM social_channel_credentials
      WHERE channel = ${channel}
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown credentials delete error';
    throw new Error(`Failed to delete social credential: ${message}`);
  }
}

type RefreshTokenResponse = {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

async function refreshYoutubeAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing YouTube OAuth client configuration');
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh YouTube access token: ${errorText}`);
  }

  return (await response.json()) as RefreshTokenResponse;
}

export async function getValidYoutubeAccessToken(): Promise<string> {
  try {
    const credential = await getSocialCredential('youtube');
    if (!credential?.accessToken || !credential.refreshToken || !credential.expiresAt) {
      throw new Error('YouTube channel is not connected');
    }

    if (credential.expiresAt.getTime() - Date.now() > 60_000) {
      return credential.accessToken;
    }

    const decryptedRefreshToken = decryptToken(credential.refreshToken);
    const refreshed = await refreshYoutubeAccessToken(decryptedRefreshToken);
    const nextExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
    await saveSocialCredential({
      channel: 'youtube',
      accessToken: refreshed.access_token,
      expiresAt: nextExpiry,
      scopes: refreshed.scope ?? credential.scopes,
      metadata: credential.metadata,
    });
    return refreshed.access_token;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown YouTube token error';
    throw new Error(`Failed to get valid YouTube access token: ${message}`);
  }
}
