import { sql } from '@/lib/db/vercel-postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';
import { getValidYoutubeAccessToken } from '@/lib/social/credentials';
import { listAllPostsForVideo, updateSocialPostStatus } from '@/lib/social/repository';
import { validateYoutubeCopy } from '@/lib/social/copy/validation';
import {
  buildCrossLinkLines,
  extractPublishedSiblings,
  injectCrossLinks,
  siblingsForCurrent,
} from '@/lib/social/cross-links';
import { resolveThumbnailUrl, uploadThumbnailToYoutube } from './youtube-thumbnail';

type SocialPostSourceRow = {
  id: string;
  variant: 'landscape_16_9' | 'vertical_9_16';
  copy_json: unknown;
  campaign_video_id: string;
  render_config_json: unknown;
  prompt_json: unknown;
  s3_video_url: string | null;
};

function resolveModeFromRow(row: SocialPostSourceRow): import('@/lib/social/copy/types').CampaignVideoMode {
  const sources: unknown[] = [row.prompt_json, row.render_config_json];
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    const obj = source as Record<string, unknown>;
    const value = (obj.compositionTemplate || obj.template);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === 'brand_slides_v1') return 'brand_slides_v1';
      if (trimmed === 'on_sale_slides_v1') return 'on_sale_slides_v1';
      if (trimmed === 'category_slides_v1') return 'category_slides_v1';
    }
  }
  return 'default_single_scene';
}

type YoutubeUploadResult = {
  id?: string;
};

function resolveVideoUrl(row: SocialPostSourceRow): string {
  const render = row.render_config_json;
  if (render && typeof render === 'object' && !Array.isArray(render)) {
    const variants = (render as Record<string, unknown>).variants;
    if (Array.isArray(variants)) {
      for (const item of variants) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const entry = item as Record<string, unknown>;
        if (String(entry.key || '') === row.variant) {
          const videoUrl = typeof entry.videoUrl === 'string' ? entry.videoUrl.trim() : '';
          if (videoUrl) return videoUrl;
        }
      }
    }
  }
  if (row.variant === 'landscape_16_9' && row.s3_video_url) {
    return row.s3_video_url;
  }
  throw new Error(`Missing source video URL for variant ${row.variant}`);
}

async function createResumableUploadUrl(accessToken: string, metadata: unknown, contentLength?: string | null): Promise<string> {
  const response = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        ...(contentLength ? { 'X-Upload-Content-Length': contentLength } : {}),
      },
      body: JSON.stringify(metadata),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to start YouTube upload: ${text}`);
  }
  const uploadUrl = response.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube resumable upload URL missing from response');
  }
  return uploadUrl;
}

async function uploadVideoBody(uploadUrl: string, sourceResponse: Response): Promise<YoutubeUploadResult> {
  if (!sourceResponse.body) {
    throw new Error('Source video stream is not available');
  }
  const contentLength = sourceResponse.headers.get('content-length');
  const init: RequestInit & { duplex: 'half' } = {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      ...(contentLength ? { 'Content-Length': String(contentLength) } : {}),
    },
    body: sourceResponse.body,
    duplex: 'half',
  };
  const uploadResponse = await fetch(uploadUrl, init);
  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    throw new Error(`Failed to upload video body: ${text}`);
  }
  return (await uploadResponse.json()) as YoutubeUploadResult;
}

function buildExternalUrl(videoId: string, variant: 'landscape_16_9' | 'vertical_9_16'): string {
  return variant === 'vertical_9_16'
    ? `https://youtube.com/shorts/${videoId}`
    : `https://youtu.be/${videoId}`;
}

export async function publishToYoutube(socialPostId: string): Promise<{
  ok: true;
  videoId: string;
  url: string;
} | {
  ok: false;
  error: string;
}> {
  try {
    await ensureEmailPlatformSchema();
    const result = await sql`
      SELECT sp.id, sp.variant, sp.copy_json, sp.campaign_video_id, v.render_config_json, v.prompt_json, v.s3_video_url
      FROM social_posts sp
      JOIN email_campaign_videos v ON v.id = sp.campaign_video_id
      WHERE sp.id = ${socialPostId}
        AND sp.channel = 'youtube'
      LIMIT 1
    `;
    const row = result.rows[0] as SocialPostSourceRow | undefined;
    if (!row) {
      await updateSocialPostStatus(socialPostId, 'publish_failed', { errorMessage: 'YouTube social post not found' });
      return { ok: false, error: 'YouTube social post not found' };
    }

    const mode = resolveModeFromRow(row);
    const validated = validateYoutubeCopy(row.copy_json, row.variant, { mode });
    if (!validated.ok) {
      await updateSocialPostStatus(socialPostId, 'publish_failed', { errorMessage: `Invalid post copy: ${validated.reason}` });
      return { ok: false, error: `Invalid post copy: ${validated.reason}` };
    }

    const videoUrl = resolveVideoUrl(row);
    const accessToken = await getValidYoutubeAccessToken();
    const sourceResponse = await fetch(videoUrl, { cache: 'no-store' });
    if (!sourceResponse.ok) {
      const text = await sourceResponse.text();
      throw new Error(`Failed to fetch source video: ${text}`);
    }

    const allPosts = await listAllPostsForVideo(row.campaign_video_id);
    const siblings = siblingsForCurrent(extractPublishedSiblings(allPosts), {
      channel: 'youtube',
      variant: row.variant,
    });
    const crossLines = buildCrossLinkLines(siblings);
    const finalDescription = injectCrossLinks(validated.copy.description, crossLines).trim();

    const metadata = {
      snippet: {
        title: validated.copy.title,
        description: finalDescription,
        tags: validated.copy.tags,
        categoryId: validated.copy.categoryId,
      },
      status: {
        privacyStatus: validated.copy.privacyStatus,
        madeForKids: validated.copy.madeForKids,
        selfDeclaredMadeForKids: validated.copy.madeForKids,
      },
    };
    const uploadUrl = await createResumableUploadUrl(accessToken, metadata, sourceResponse.headers.get('content-length'));
    const uploadResult = await uploadVideoBody(uploadUrl, sourceResponse);
    const videoId = uploadResult.id?.trim();
    if (!videoId) throw new Error('YouTube upload succeeded but video id missing');
    const externalUrl = buildExternalUrl(videoId, row.variant);

    const thumbnailUrl = resolveThumbnailUrl(
      row.render_config_json as Record<string, unknown> | null,
      row.variant
    );
    if (thumbnailUrl) {
      try {
        await uploadThumbnailToYoutube(accessToken, videoId, thumbnailUrl);
        console.log(`[youtube] thumbnail uploaded video=${videoId}`);
      } catch (thumbError) {
        const message = thumbError instanceof Error ? thumbError.message : 'thumbnail upload error';
        console.warn(`[youtube] thumbnail upload failed video=${videoId}: ${message}`);
      }
    }

    await updateSocialPostStatus(socialPostId, 'published', {
      externalPostId: videoId,
      externalUrl,
      publishedAt: new Date(),
      errorMessage: null,
    });
    return { ok: true, videoId, url: externalUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'YouTube publish failed';
    await updateSocialPostStatus(socialPostId, 'publish_failed', { errorMessage: message });
    return { ok: false, error: message };
  }
}
