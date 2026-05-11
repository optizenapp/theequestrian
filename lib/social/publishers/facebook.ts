import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import { getSocialCredential } from '@/lib/social/credentials';
import { getMetaSystemCredential } from '@/lib/social/meta-system';
import { updateSocialPostStatus } from '@/lib/social/repository';
import { resolveFrameThumbnailUrl } from './youtube-thumbnail';

type SocialPostSourceRow = {
  id: string;
  variant: 'landscape_16_9' | 'vertical_9_16';
  copy_json: unknown;
  render_config_json: unknown;
  s3_video_url: string | null;
};

function extractVideoUrl(row: SocialPostSourceRow): string {
  const render = row.render_config_json;
  if (render && typeof render === 'object' && !Array.isArray(render)) {
    const variants = (render as Record<string, unknown>).variants;
    if (Array.isArray(variants)) {
      for (const item of variants) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const entry = item as Record<string, unknown>;
        if (String(entry.key || '') === row.variant) {
          const value = typeof entry.videoUrl === 'string' ? entry.videoUrl.trim() : '';
          if (value) return value;
        }
      }
    }
  }
  if (row.s3_video_url) return row.s3_video_url;
  throw new Error('Missing video URL for Facebook publish');
}

function extractMessage(copyJson: unknown): string {
  if (!copyJson || typeof copyJson !== 'object' || Array.isArray(copyJson)) {
    return 'New video from The Equestrian.';
  }
  const source = copyJson as Record<string, unknown>;
  const fields = ['message', 'caption', 'description', 'title'];
  for (const key of fields) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'New video from The Equestrian.';
}

async function appendThumbnail(form: FormData, thumbnailUrl: string | null): Promise<void> {
  if (!thumbnailUrl) return;
  const response = await fetch(thumbnailUrl, { cache: 'no-store' });
  if (!response.ok) {
    console.warn(`[facebook-publish] thumbnail fetch failed: ${response.status}`);
    return;
  }
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const bytes = await response.arrayBuffer();
  form.append('thumb', new Blob([bytes], { type: contentType }), 'thumbnail.jpg');
}

export async function publishToFacebook(socialPostId: string): Promise<{ ok: true; postId: string; url: string } | { ok: false; error: string }> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT sp.id, sp.variant, sp.copy_json, v.render_config_json, v.s3_video_url
      FROM social_posts sp
      JOIN email_campaign_videos v ON v.id = sp.campaign_video_id
      WHERE sp.id = ${socialPostId}
        AND sp.channel = 'facebook'
      LIMIT 1
    `;
    const row = result.rows[0] as SocialPostSourceRow | undefined;
    if (!row) {
      await updateSocialPostStatus(socialPostId, 'publish_failed', { errorMessage: 'Facebook social post not found' });
      return { ok: false, error: 'Facebook social post not found' };
    }
    const systemCredential = await getMetaSystemCredential();
    const storedCredential = systemCredential ? null : await getSocialCredential('facebook');
    const pageId = systemCredential?.pageId ?? storedCredential?.externalAccountId;
    const accessToken = systemCredential?.accessToken ?? storedCredential?.accessToken;
    if (!pageId || !accessToken) {
      throw new Error('Facebook Page is not connected');
    }
    const body = new FormData();
    body.set('access_token', accessToken);
    body.set('description', extractMessage(row.copy_json));
    body.set('file_url', extractVideoUrl(row));
    await appendThumbnail(body, resolveFrameThumbnailUrl(row.render_config_json as Record<string, unknown> | null, row.variant));
    const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/videos`, {
      method: 'POST',
      body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Facebook publish failed: ${text}`);
    }
    const payload = (await response.json()) as { id?: string };
    const postId = payload.id?.trim();
    if (!postId) throw new Error('Facebook publish succeeded but post id missing');
    const url = `https://www.facebook.com/${postId}`;
    await updateSocialPostStatus(socialPostId, 'published', {
      externalPostId: postId,
      externalUrl: url,
      publishedAt: new Date(),
      errorMessage: null,
    });
    return { ok: true, postId, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Facebook publish failed';
    console.error(`[facebook-publish] failed post=${socialPostId}: ${message}`);
    await updateSocialPostStatus(socialPostId, 'publish_failed', { errorMessage: message });
    return { ok: false, error: message };
  }
}
