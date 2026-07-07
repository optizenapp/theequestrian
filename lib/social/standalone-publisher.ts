import sharp from 'sharp';
import { uploadBufferToS3 } from '@/lib/s3/storage';
import { getValidYoutubeAccessToken, getSocialCredential } from './credentials';
import { getMetaSystemCredential } from './meta-system';
import { getStandaloneSocialPost, markStandaloneSocialPublished, updateStandaloneSocialPost } from './standalone-repository';
import type { StandaloneSocialPost } from './standalone-types';
import {
  createInstagramImageContainer,
  createInstagramMediaContainer,
  getInstagramMediaPermalink,
  publishInstagramContainer,
  waitForInstagramMediaReady,
} from './publishers/instagram-api';

type PublishResult = { ok: true; externalPostId: string; externalUrl: string | null } | { ok: false; error: string };

function firstMedia(post: StandaloneSocialPost): string {
  const url = post.mediaUrls[0]?.trim();
  if (!url) throw new Error(`${post.platform} ${post.postKind} posts require a media URL`);
  return url;
}

function publishText(post: StandaloneSocialPost): string {
  return [post.content, post.sourceUrl].filter(Boolean).join('\n\n');
}

function decodeRepeated(value: string): string {
  let output = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(output);
      if (decoded === output) break;
      output = decoded;
    } catch {
      break;
    }
  }
  return output;
}

function unwrapProxiedImageUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  if (!value) return value;
  try {
    const parsed = new URL(value);
    const isNextImage = parsed.pathname === '/_next/image';
    const isImageProxy = parsed.pathname === '/api/image-proxy';
    if (!isNextImage && !isImageProxy) return value;
    const nested = parsed.searchParams.get('url');
    if (!nested) return value;
    const resolved = decodeRepeated(nested).trim();
    return /^https?:\/\//i.test(resolved) ? resolved : value;
  } catch {
    return value;
  }
}

function buildInstagramProxyCandidate(sourceUrl: string): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  let base = 'https://www.theequestrian.com.au';
  if (configured) {
    try {
      const parsed = new URL(configured);
      const host = parsed.hostname.toLowerCase();
      const isLocal = host === 'localhost' || host.endsWith('.local') || host === '127.0.0.1' || host === '0.0.0.0';
      if (!isLocal) base = configured;
    } catch {
      base = 'https://www.theequestrian.com.au';
    }
  }
  base = base.replace(/\/+$/, '');
  return `${base}/api/image-proxy?url=${encodeURIComponent(sourceUrl)}`;
}

function buildInstagramImageCandidates(rawUrl: string): string[] {
  const value = unwrapProxiedImageUrl(rawUrl);
  if (!value) return [];
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return [value];
  }
  if (parsed.hostname !== 'cdn.shopify.com' && !parsed.hostname.endsWith('.cdn.shopify.com')) {
    return [buildInstagramProxyCandidate(value), value];
  }
  const withTransforms = new URL(parsed.toString());
  withTransforms.searchParams.set('width', '1080');
  withTransforms.searchParams.set('crop', 'center');
  return [
    buildInstagramProxyCandidate(value),
    value,
    (() => {
      const candidate = new URL(withTransforms.toString());
      candidate.searchParams.set('format', 'jpg');
      return candidate.toString();
    })(),
    (() => {
      const candidate = new URL(withTransforms.toString());
      candidate.searchParams.set('format', 'pjpg');
      return candidate.toString();
    })(),
  ];
}

function isRecoverableInstagramImageError(message: string): boolean {
  return (
    message.includes('aspect ratio') ||
    message.includes('"error_subcode":2207009') ||
    message.includes('"error_subcode":2207052') ||
    message.includes('Only photo or video can be accepted as media type') ||
    message.includes("media URI doesn't meet our requirements")
  );
}

async function createHostedInstagramJpegCandidate(rawUrl: string): Promise<{ url: string } | { error: string }> {
  const sourceUrl = unwrapProxiedImageUrl(rawUrl);
  if (!sourceUrl) return { error: 'empty source url' };
  let response: Response;
  try {
    response = await fetch(sourceUrl, { cache: 'no-store' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown fetch failure';
    console.error(`[instagram-publish] fetch source failed (${sourceUrl}): ${message}`);
    return { error: `fetch source failed: ${message}` };
  }
  if (!response.ok) {
    console.error(`[instagram-publish] fetch source non-ok (${sourceUrl}): ${response.status}`);
    return { error: `fetch source ${response.status}` };
  }
  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  if (!sourceBuffer.length) return { error: 'source image was empty' };
  let jpegBuffer: Buffer;
  try {
    jpegBuffer = await sharp(sourceBuffer, { failOn: 'none' }).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown image conversion failure';
    console.error(`[instagram-publish] sharp jpeg conversion failed (${sourceUrl}): ${message}`);
    return { error: `sharp conversion failed: ${message}` };
  }
  try {
    const uploaded = await uploadBufferToS3(jpegBuffer, 'social/instagram-images', 'image/jpeg', { forceUnique: true });
    console.error(`[instagram-publish] hosted jpeg uploaded for ${sourceUrl} -> ${uploaded}`);
    return { url: uploaded };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown upload failure';
    console.error(`[instagram-publish] s3 upload failed (${sourceUrl}): ${message}`);
    return { error: `s3 upload failed: ${message}` };
  }
}

async function publishFacebook(post: StandaloneSocialPost): Promise<PublishResult> {
  const system = await getMetaSystemCredential();
  const stored = system ? null : await getSocialCredential('facebook');
  const pageId = system?.pageId ?? stored?.externalAccountId;
  const accessToken = system?.accessToken ?? stored?.accessToken;
  if (!pageId || !accessToken) throw new Error('Facebook Page is not connected');
  const endpoint = post.postKind === 'image' ? 'photos' : post.postKind === 'video' ? 'videos' : 'feed';
  let body: BodyInit;
  if (post.postKind === 'image') {
    const sourceUrl = unwrapProxiedImageUrl(firstMedia(post));
    const imageResponse = await fetch(sourceUrl, { cache: 'no-store' });
    if (!imageResponse.ok) throw new Error(`Failed to fetch Facebook image: ${await imageResponse.text()}`);
    const sourceBuffer = Buffer.from(await imageResponse.arrayBuffer());
    if (!sourceBuffer.length) throw new Error('Facebook image source was empty');
    const jpegBuffer = await sharp(sourceBuffer, { failOn: 'none' })
      .rotate()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    console.error(`[facebook-publish] normalized image bytes=${jpegBuffer.length} source=${sourceUrl}`);
    const form = new FormData();
    form.set('access_token', accessToken);
    form.set('caption', publishText(post));
    form.set('source', new Blob([new Uint8Array(jpegBuffer)], { type: 'image/jpeg' }), 'social-image.jpg');
    body = form;
  } else if (post.postKind === 'video') {
    const params = new URLSearchParams({ access_token: accessToken });
    params.set('file_url', firstMedia(post));
    params.set('description', publishText(post));
    body = params;
  } else {
    const params = new URLSearchParams({ access_token: accessToken });
    params.set('message', publishText(post));
    body = params;
  }
  const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/${endpoint}`, {
    method: 'POST',
    body,
  });
  if (!response.ok) throw new Error(`Facebook publish failed: ${await response.text()}`);
  const payload = (await response.json()) as { id?: string; post_id?: string };
  const id = (payload.post_id || payload.id || '').trim();
  if (!id) throw new Error('Facebook publish succeeded but id missing');
  return { ok: true, externalPostId: id, externalUrl: `https://www.facebook.com/${id}` };
}

async function publishInstagram(post: StandaloneSocialPost): Promise<PublishResult> {
  const system = await getMetaSystemCredential();
  const stored = system ? null : await getSocialCredential('instagram');
  const instagramId = system?.instagramId ?? stored?.externalAccountId;
  const accessToken = system?.accessToken ?? stored?.accessToken;
  if (!instagramId || !accessToken) throw new Error('Instagram account is not connected');
  const caption = [post.content, post.sourceUrl].filter(Boolean).join('\n\n');
  let containerId: string;
  if (post.postKind === 'video') {
    containerId = await createInstagramMediaContainer(instagramId, accessToken, firstMedia(post), caption);
  } else {
    const mediaUrls = post.mediaUrls.map((item) => item.trim()).filter(Boolean);
    const hostedCandidates: string[] = [];
    const hostedErrors: string[] = [];
    for (const mediaUrl of mediaUrls) {
      const normalized = await createHostedInstagramJpegCandidate(mediaUrl);
      if ('url' in normalized) hostedCandidates.push(normalized.url);
      else hostedErrors.push(normalized.error);
    }
    const candidates = Array.from(new Set([...hostedCandidates, ...mediaUrls.flatMap((url) => buildInstagramImageCandidates(url))]));
    if (!candidates.length) throw new Error('instagram image posts require a media URL');
    console.error(`[instagram-publish] candidate count=${candidates.length} hosted=${hostedCandidates.length} hosted_errors=${hostedErrors.join(' | ') || 'none'}`);
    let lastError = '';
    let lastUrl = '';
    let createdContainer: string | null = null;
    for (const imageUrl of candidates) {
      console.error(`[instagram-publish] trying candidate: ${imageUrl}`);
      try {
        createdContainer = await createInstagramImageContainer(instagramId, accessToken, imageUrl, caption);
        console.error(`[instagram-publish] container created with: ${imageUrl}`);
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Instagram image container creation failed';
        if (!isRecoverableInstagramImageError(message)) throw error;
        lastError = message;
        lastUrl = imageUrl;
      }
    }
    if (!createdContainer) {
      const hostedSummary = hostedErrors.length ? ` hosted_jpeg_errors=[${hostedErrors.join(' | ')}]` : '';
      throw new Error(`Instagram could not fetch any candidate image. last_url=${lastUrl} last_error=${lastError}${hostedSummary}`);
    }
    containerId = createdContainer;
  }
  await waitForInstagramMediaReady(containerId, accessToken);
  const mediaId = await publishInstagramContainer(instagramId, accessToken, containerId);
  return { ok: true, externalPostId: mediaId, externalUrl: await getInstagramMediaPermalink(mediaId, accessToken) };
}

async function publishYoutubeVideo(post: StandaloneSocialPost): Promise<PublishResult> {
  const accessToken = await getValidYoutubeAccessToken();
  const sourceResponse = await fetch(firstMedia(post), { cache: 'no-store' });
  if (!sourceResponse.ok) throw new Error(`Failed to fetch source video: ${await sourceResponse.text()}`);
  if (!sourceResponse.body) throw new Error('Source video stream is not available');
  const description = publishText(post);
  const metadata = {
    snippet: { title: (post.title || post.content.slice(0, 90) || 'The Equestrian').slice(0, 100), description },
    status: { privacyStatus: 'public', madeForKids: false, selfDeclaredMadeForKids: false },
  };
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4' },
    body: JSON.stringify(metadata),
  });
  if (!start.ok) throw new Error(`Failed to start YouTube upload: ${await start.text()}`);
  const uploadUrl = start.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube resumable upload URL missing');
  const upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: sourceResponse.body, duplex: 'half' } as RequestInit & { duplex: 'half' });
  if (!upload.ok) throw new Error(`Failed to upload YouTube video: ${await upload.text()}`);
  const payload = (await upload.json()) as { id?: string };
  const videoId = payload.id?.trim();
  if (!videoId) throw new Error('YouTube upload succeeded but video id missing');
  const url = post.variant === 'vertical_9_16' ? `https://youtube.com/shorts/${videoId}` : `https://youtu.be/${videoId}`;
  return { ok: true, externalPostId: videoId, externalUrl: url };
}

export async function publishStandaloneSocialPost(id: string): Promise<PublishResult> {
  const post = await getStandaloneSocialPost(id);
  if (!post) return { ok: false, error: 'Social post not found' };
  try {
    await updateStandaloneSocialPost(id, { status: 'publishing', errorMessage: null });
    const result = post.platform === 'facebook'
      ? await publishFacebook(post)
      : post.platform === 'instagram'
        ? await publishInstagram(post)
        : post.postKind === 'video'
          ? await publishYoutubeVideo(post)
          : { ok: false as const, error: 'YouTube text/community posting is not available with the current YouTube API capability.' };
    await markStandaloneSocialPublished(id, result.ok ? result : { errorMessage: result.error });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    await markStandaloneSocialPublished(id, { errorMessage: message });
    return { ok: false, error: message };
  }
}
