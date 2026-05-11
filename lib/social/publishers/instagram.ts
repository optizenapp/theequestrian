import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import { getSocialCredential } from '@/lib/social/credentials';
import { getMetaSystemCredential } from '@/lib/social/meta-system';
import { updateSocialPostStatus } from '@/lib/social/repository';
import { resolveFrameThumbnailUrl } from './youtube-thumbnail';
import {
  createInstagramMediaContainer,
  getInstagramMediaPermalink,
  publishInstagramContainer,
  waitForInstagramMediaReady,
} from './instagram-api';

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
  throw new Error('Missing video URL for Instagram publish');
}

function extractCaption(copyJson: unknown): string {
  if (!copyJson || typeof copyJson !== 'object' || Array.isArray(copyJson)) {
    return 'New video from The Equestrian.';
  }
  const source = copyJson as Record<string, unknown>;
  const fields = ['caption', 'description', 'message', 'title'];
  for (const key of fields) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'New video from The Equestrian.';
}

export async function publishToInstagram(
  socialPostId: string
): Promise<{ ok: true; mediaId: string; url: string } | { ok: false; error: string }> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT sp.id, sp.variant, sp.copy_json, v.render_config_json, v.s3_video_url
      FROM social_posts sp
      JOIN email_campaign_videos v ON v.id = sp.campaign_video_id
      WHERE sp.id = ${socialPostId}
        AND sp.channel = 'instagram'
      LIMIT 1
    `;
    const row = result.rows[0] as SocialPostSourceRow | undefined;
    if (!row) {
      await updateSocialPostStatus(socialPostId, 'publish_failed', { errorMessage: 'Instagram social post not found' });
      return { ok: false, error: 'Instagram social post not found' };
    }
    const systemCredential = await getMetaSystemCredential();
    const storedCredential = systemCredential ? null : await getSocialCredential('instagram');
    const instagramId = systemCredential?.instagramId ?? storedCredential?.externalAccountId;
    const accessToken = systemCredential?.accessToken ?? storedCredential?.accessToken;
    if (!instagramId || !accessToken) {
      throw new Error('Instagram account is not connected');
    }
    const videoUrl = extractVideoUrl(row);
    const caption = extractCaption(row.copy_json);
    const coverUrl = resolveFrameThumbnailUrl(row.render_config_json as Record<string, unknown> | null, row.variant);
    const containerId = await createInstagramMediaContainer(instagramId, accessToken, videoUrl, caption, coverUrl);
    await waitForInstagramMediaReady(containerId, accessToken);
    const mediaId = await publishInstagramContainer(instagramId, accessToken, containerId);
    const url = await getInstagramMediaPermalink(mediaId, accessToken) ?? `https://www.instagram.com/`;
    await updateSocialPostStatus(socialPostId, 'published', {
      externalPostId: mediaId,
      externalUrl: url,
      publishedAt: new Date(),
      errorMessage: null,
    });
    return { ok: true, mediaId, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Instagram publish failed';
    console.error(`[instagram-publish] failed post=${socialPostId}: ${message}`);
    await updateSocialPostStatus(socialPostId, 'publish_failed', { errorMessage: message });
    return { ok: false, error: message };
  }
}
