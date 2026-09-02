import { sql } from '@/lib/db/vercel-postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import type {
  StandaloneSocialPost,
  StandaloneSocialPostInput,
  StandaloneSocialStatus,
} from './standalone-types';

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function mapRow(row: Record<string, unknown>): StandaloneSocialPost {
  return {
    id: String(row.id),
    platform: String(row.platform) as StandaloneSocialPost['platform'],
    postKind: String(row.post_kind) as StandaloneSocialPost['postKind'],
    variant: row.variant ? (String(row.variant) as StandaloneSocialPost['variant']) : null,
    status: String(row.status) as StandaloneSocialStatus,
    content: String(row.content || ''),
    title: row.title ? String(row.title) : null,
    mediaUrls: stringArray(row.media_urls),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    sourceType: String(row.source_type || 'manual'),
    externalPostId: row.external_post_id ? String(row.external_post_id) : null,
    externalUrl: row.external_url ? String(row.external_url) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    scheduledFor: row.scheduled_for ? String(row.scheduled_for) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    metadata: record(row.metadata),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listStandaloneSocialPosts(): Promise<StandaloneSocialPost[]> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    SELECT id, platform, post_kind, variant, status, content, title, media_urls, source_url, source_type,
      external_post_id, external_url, error_message, scheduled_for, published_at, metadata, created_at, updated_at
    FROM admin_social_posts
    ORDER BY updated_at DESC
    LIMIT 100
  `;
  return result.rows.map((row) => mapRow(row));
}

export async function getStandaloneSocialPost(id: string): Promise<StandaloneSocialPost | null> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    SELECT id, platform, post_kind, variant, status, content, title, media_urls, source_url, source_type,
      external_post_id, external_url, error_message, scheduled_for, published_at, metadata, created_at, updated_at
    FROM admin_social_posts
    WHERE id = ${id}
    LIMIT 1
  `;
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function createStandaloneSocialPost(input: StandaloneSocialPostInput): Promise<StandaloneSocialPost> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    INSERT INTO admin_social_posts (
      platform, post_kind, variant, status, content, title, media_urls, source_url, source_type, metadata, updated_at
    ) VALUES (
      ${input.platform}, ${input.postKind}, ${input.variant ?? null}, 'draft', ${input.content}, ${input.title ?? null},
      ${JSON.stringify(input.mediaUrls ?? [])}::jsonb, ${input.sourceUrl ?? null}, ${input.sourceType ?? 'manual'},
      ${JSON.stringify(input.metadata ?? {})}::jsonb, NOW()
    )
    RETURNING id, platform, post_kind, variant, status, content, title, media_urls, source_url, source_type,
      external_post_id, external_url, error_message, scheduled_for, published_at, metadata, created_at, updated_at
  `;
  const row = result.rows[0];
  if (!row) throw new Error('No standalone social post returned');
  return mapRow(row);
}

export async function updateStandaloneSocialPost(
  id: string,
  input: Partial<StandaloneSocialPostInput> & { status?: StandaloneSocialStatus; errorMessage?: string | null }
): Promise<StandaloneSocialPost> {
  const existing = await getStandaloneSocialPost(id);
  if (!existing) throw new Error('Social post not found');
  const result = await sql`
    UPDATE admin_social_posts
    SET platform = ${input.platform ?? existing.platform},
      post_kind = ${input.postKind ?? existing.postKind},
      variant = ${input.variant === undefined ? existing.variant : input.variant},
      status = ${input.status ?? 'ready_for_review'},
      content = ${input.content ?? existing.content},
      title = ${input.title === undefined ? existing.title : input.title},
      media_urls = ${JSON.stringify(input.mediaUrls ?? existing.mediaUrls)}::jsonb,
      source_url = ${input.sourceUrl === undefined ? existing.sourceUrl : input.sourceUrl},
      source_type = ${input.sourceType ?? existing.sourceType},
      metadata = ${JSON.stringify(input.metadata ?? existing.metadata)}::jsonb,
      error_message = ${input.errorMessage ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, platform, post_kind, variant, status, content, title, media_urls, source_url, source_type,
      external_post_id, external_url, error_message, scheduled_for, published_at, metadata, created_at, updated_at
  `;
  const row = result.rows[0];
  if (!row) throw new Error('Social post not found');
  return mapRow(row);
}

export async function deleteStandaloneSocialPost(id: string): Promise<void> {
  await ensureEmailPlatformSchema();
  await sql`DELETE FROM admin_social_posts WHERE id = ${id}`;
}

export async function markStandaloneSocialPublished(
  id: string,
  values: { externalPostId?: string | null; externalUrl?: string | null; errorMessage?: string | null }
): Promise<StandaloneSocialPost> {
  const status: StandaloneSocialStatus = values.errorMessage ? 'publish_failed' : 'published';
  const result = await sql`
    UPDATE admin_social_posts
    SET status = ${status}, external_post_id = ${values.externalPostId ?? null},
      external_url = ${values.externalUrl ?? null}, error_message = ${values.errorMessage ?? null},
      published_at = ${values.errorMessage ? null : new Date().toISOString()}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, platform, post_kind, variant, status, content, title, media_urls, source_url, source_type,
      external_post_id, external_url, error_message, scheduled_for, published_at, metadata, created_at, updated_at
  `;
  const row = result.rows[0];
  if (!row) throw new Error('Social post not found');
  return mapRow(row);
}
