type InstagramCreateResponse = { id?: string };
type InstagramStatusResponse = { status_code?: string; status?: string };
type InstagramPublishResponse = { id?: string };
type InstagramPermalinkResponse = { permalink?: string };

function graphUrl(path: string): string {
  return `https://graph.facebook.com/v23.0/${path}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createInstagramMediaContainer(
  igUserId: string,
  pageAccessToken: string,
  videoUrl: string,
  caption: string,
  coverUrl?: string | null
): Promise<string> {
  const body = new URLSearchParams({ access_token: pageAccessToken, media_type: 'REELS', video_url: videoUrl, caption });
  if (coverUrl) body.set('cover_url', coverUrl);
  const response = await fetch(graphUrl(`${encodeURIComponent(igUserId)}/media`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Instagram create media container failed: ${await response.text()}`);
  const payload = (await response.json()) as InstagramCreateResponse;
  if (!payload.id?.trim()) throw new Error('Instagram media container id missing');
  return payload.id.trim();
}

export async function createInstagramImageContainer(
  igUserId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const body = new URLSearchParams({ access_token: pageAccessToken, image_url: imageUrl, caption });
  const response = await fetch(graphUrl(`${encodeURIComponent(igUserId)}/media`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Instagram create image container failed: ${await response.text()}`);
  const payload = (await response.json()) as InstagramCreateResponse;
  if (!payload.id?.trim()) throw new Error('Instagram image container id missing');
  return payload.id.trim();
}

export async function waitForInstagramMediaReady(containerId: string, accessToken: string): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const url = new URL(graphUrl(encodeURIComponent(containerId)));
    url.searchParams.set('fields', 'status_code,status');
    url.searchParams.set('access_token', accessToken);
    const response = await fetch(url.toString(), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Instagram media status check failed: ${await response.text()}`);
    const payload = (await response.json()) as InstagramStatusResponse;
    if (payload.status_code === 'FINISHED') return;
    if (payload.status_code === 'ERROR' || payload.status_code === 'EXPIRED') {
      throw new Error(`Instagram media processing failed: ${payload.status || payload.status_code}`);
    }
    await wait(5000);
  }
  throw new Error('Instagram media was not ready after waiting 60 seconds');
}

export async function publishInstagramContainer(igUserId: string, pageAccessToken: string, creationId: string): Promise<string> {
  const body = new URLSearchParams({ access_token: pageAccessToken, creation_id: creationId });
  const response = await fetch(graphUrl(`${encodeURIComponent(igUserId)}/media_publish`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Instagram publish failed: ${await response.text()}`);
  const payload = (await response.json()) as InstagramPublishResponse;
  if (!payload.id?.trim()) throw new Error('Instagram media id missing');
  return payload.id.trim();
}

export async function getInstagramMediaPermalink(mediaId: string, accessToken: string): Promise<string | null> {
  const url = new URL(graphUrl(encodeURIComponent(mediaId)));
  url.searchParams.set('fields', 'permalink');
  url.searchParams.set('access_token', accessToken);
  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Instagram permalink lookup failed: ${await response.text()}`);
  const payload = (await response.json()) as InstagramPermalinkResponse;
  return payload.permalink?.trim() || null;
}
