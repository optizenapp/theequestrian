import { sql } from '@/lib/db/vercel-postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import type { SocialVariant } from './copy/types';

export type SocialChannel = 'youtube' | 'instagram' | 'twitter' | 'facebook';
export type SocialPostStatus = 'building' | 'ready_for_review' | 'publishing' | 'published' | 'publish_failed';

export type SocialPostRow = {
  id: string;
  campaignVideoId: string;
  channel: SocialChannel;
  variant: SocialVariant;
  status: SocialPostStatus;
  copyJson: Record<string, unknown>;
  externalPostId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

function mapRow(row: Record<string, unknown>): SocialPostRow {
  return {
    id: String(row.id),
    campaignVideoId: String(row.campaign_video_id),
    channel: String(row.channel) as SocialChannel,
    variant: String(row.variant) as SocialVariant,
    status: String(row.status) as SocialPostStatus,
    copyJson:
      row.copy_json && typeof row.copy_json === 'object' && !Array.isArray(row.copy_json)
        ? (row.copy_json as Record<string, unknown>)
        : {},
    externalPostId: row.external_post_id ? String(row.external_post_id) : null,
    externalUrl: row.external_url ? String(row.external_url) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function listSocialPosts(campaignVideoId: string, channel: SocialChannel): Promise<SocialPostRow[]> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT id, campaign_video_id, channel, variant, status, copy_json, external_post_id, external_url, error_message, published_at, updated_at
      FROM social_posts
      WHERE campaign_video_id = ${campaignVideoId}
        AND channel = ${channel}
      ORDER BY CASE variant WHEN 'landscape_16_9' THEN 1 ELSE 2 END
    `;
    return result.rows.map((row) => mapRow(row));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown social post list error';
    throw new Error(`Failed to list social posts: ${message}`);
  }
}

export async function listAllPostsForVideo(campaignVideoId: string): Promise<SocialPostRow[]> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT id, campaign_video_id, channel, variant, status, copy_json, external_post_id, external_url, error_message, published_at, updated_at
      FROM social_posts
      WHERE campaign_video_id = ${campaignVideoId}
    `;
    return result.rows.map((row) => mapRow(row));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown social post list error';
    throw new Error(`Failed to list social posts for video: ${message}`);
  }
}

export async function upsertSocialPost(params: {
  campaignVideoId: string;
  channel: SocialChannel;
  variant: SocialVariant;
  status: SocialPostStatus;
  copyJson: Record<string, unknown>;
}): Promise<SocialPostRow> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      INSERT INTO social_posts (campaign_video_id, channel, variant, status, copy_json, updated_at)
      VALUES (
        ${params.campaignVideoId},
        ${params.channel},
        ${params.variant},
        ${params.status},
        ${JSON.stringify(params.copyJson)}::jsonb,
        NOW()
      )
      ON CONFLICT (campaign_video_id, channel, variant) DO UPDATE
      SET status = EXCLUDED.status,
          copy_json = EXCLUDED.copy_json,
          error_message = NULL,
          updated_at = NOW()
      RETURNING id, campaign_video_id, channel, variant, status, copy_json, external_post_id, external_url, error_message, published_at, updated_at
    `;
    const row = result.rows[0];
    if (!row) throw new Error('No social post row returned');
    return mapRow(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown social post upsert error';
    throw new Error(`Failed to upsert social post: ${message}`);
  }
}

export async function updateSocialPostCopy(postId: string, copyJson: Record<string, unknown>): Promise<SocialPostRow> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      UPDATE social_posts
      SET copy_json = ${JSON.stringify(copyJson)}::jsonb,
          status = 'ready_for_review',
          error_message = NULL,
          updated_at = NOW()
      WHERE id = ${postId}
      RETURNING id, campaign_video_id, channel, variant, status, copy_json, external_post_id, external_url, error_message, published_at, updated_at
    `;
    const row = result.rows[0];
    if (!row) throw new Error('Social post not found');
    return mapRow(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown social post update error';
    throw new Error(`Failed to update social post copy: ${message}`);
  }
}

export async function getSocialPostById(postId: string): Promise<SocialPostRow | null> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT id, campaign_video_id, channel, variant, status, copy_json, external_post_id, external_url, error_message, published_at, updated_at
      FROM social_posts
      WHERE id = ${postId}
      LIMIT 1
    `;
    const row = result.rows[0];
    return row ? mapRow(row) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown social post load error';
    throw new Error(`Failed to load social post: ${message}`);
  }
}

export async function updateSocialPostStatus(
  postId: string,
  status: SocialPostStatus,
  details?: {
    errorMessage?: string | null;
    externalPostId?: string | null;
    externalUrl?: string | null;
    publishedAt?: Date | null;
  }
): Promise<SocialPostRow> {
  try {
    await ensureEmailPlatformSchema();
    const publishedAt = details?.publishedAt ? details.publishedAt.toISOString() : null;
    const result = await sql`
      UPDATE social_posts
      SET status = ${status},
          error_message = ${details?.errorMessage ?? null},
          external_post_id = COALESCE(${details?.externalPostId ?? null}, external_post_id),
          external_url = COALESCE(${details?.externalUrl ?? null}, external_url),
          published_at = COALESCE(${publishedAt}, published_at),
          updated_at = NOW()
      WHERE id = ${postId}
      RETURNING id, campaign_video_id, channel, variant, status, copy_json, external_post_id, external_url, error_message, published_at, updated_at
    `;
    const row = result.rows[0];
    if (!row) throw new Error('Social post not found');
    return mapRow(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown social post status update error';
    throw new Error(`Failed to update social post status: ${message}`);
  }
}
