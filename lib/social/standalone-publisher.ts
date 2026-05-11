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

async function publishFacebook(post: StandaloneSocialPost): Promise<PublishResult> {
  const system = await getMetaSystemCredential();
  const stored = system ? null : await getSocialCredential('facebook');
  const pageId = system?.pageId ?? stored?.externalAccountId;
  const accessToken = system?.accessToken ?? stored?.accessToken;
  if (!pageId || !accessToken) throw new Error('Facebook Page is not connected');
  const endpoint = post.postKind === 'image' ? 'photos' : post.postKind === 'video' ? 'videos' : 'feed';
  let body: BodyInit;
  if (post.postKind === 'image') {
    const imageResponse = await fetch(firstMedia(post), { cache: 'no-store' });
    if (!imageResponse.ok) throw new Error(`Failed to fetch Facebook image: ${await imageResponse.text()}`);
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const form = new FormData();
    form.set('access_token', accessToken);
    form.set('caption', publishText(post));
    form.set('source', new Blob([await imageResponse.arrayBuffer()], { type: contentType }), 'social-image.jpg');
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
    const candidates = Array.from(new Set(post.mediaUrls.map((item) => item.trim()).filter(Boolean)));
    if (!candidates.length) throw new Error('instagram image posts require a media URL');
    let lastError = '';
    let createdContainer: string | null = null;
    for (const imageUrl of candidates) {
      try {
        createdContainer = await createInstagramImageContainer(instagramId, accessToken, imageUrl, caption);
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Instagram image container creation failed';
        const isAspectRatioError = message.includes('aspect ratio') || message.includes('"error_subcode":2207009');
        if (!isAspectRatioError) throw error;
        lastError = message;
      }
    }
    if (!createdContainer) throw new Error(lastError || 'No Instagram image candidate had a supported aspect ratio');
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
