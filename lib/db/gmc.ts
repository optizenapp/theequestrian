import { sql } from './client';

export interface GmcIntegration {
  id: number;
  merchant_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: string | null;
  scope: string | null;
  feed_id: string | null;
  feed_name: string | null;
  feed_fetch_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getGmcIntegration(): Promise<GmcIntegration | null> {
  const result = (await sql`
    SELECT *
    FROM gmc_integration
    WHERE id = 1
    LIMIT 1
  `) as GmcIntegration[];
  return result[0] ?? null;
}

export async function saveGmcIntegration(input: {
  merchantId?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: Date | null;
  scope?: string | null;
}) {
  const tokenExpiry = input.tokenExpiry ? input.tokenExpiry.toISOString() : null;
  await sql`
    INSERT INTO gmc_integration (
      id,
      merchant_id,
      access_token,
      refresh_token,
      token_expiry,
      scope,
      updated_at
    )
    VALUES (
      1,
      ${input.merchantId ?? null},
      ${input.accessToken ?? null},
      ${input.refreshToken ?? null},
      ${tokenExpiry},
      ${input.scope ?? null},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      merchant_id = COALESCE(EXCLUDED.merchant_id, gmc_integration.merchant_id),
      access_token = COALESCE(EXCLUDED.access_token, gmc_integration.access_token),
      refresh_token = COALESCE(EXCLUDED.refresh_token, gmc_integration.refresh_token),
      token_expiry = COALESCE(EXCLUDED.token_expiry, gmc_integration.token_expiry),
      scope = COALESCE(EXCLUDED.scope, gmc_integration.scope),
      updated_at = NOW()
  `;
}

export async function saveGmcFeedConfig(input: {
  feedId?: string | null;
  feedName?: string | null;
  feedFetchUrl?: string | null;
}) {
  await sql`
    INSERT INTO gmc_integration (
      id,
      feed_id,
      feed_name,
      feed_fetch_url,
      updated_at
    )
    VALUES (
      1,
      ${input.feedId ?? null},
      ${input.feedName ?? null},
      ${input.feedFetchUrl ?? null},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      feed_id = COALESCE(EXCLUDED.feed_id, gmc_integration.feed_id),
      feed_name = COALESCE(EXCLUDED.feed_name, gmc_integration.feed_name),
      feed_fetch_url = COALESCE(EXCLUDED.feed_fetch_url, gmc_integration.feed_fetch_url),
      updated_at = NOW()
  `;
}

export async function clearGmcIntegration() {
  await sql`DELETE FROM gmc_integration WHERE id = 1`;
}
