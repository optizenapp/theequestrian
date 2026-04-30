type RenderConfig = Record<string, unknown> | null | undefined;

export function resolveThumbnailUrl(
  renderConfig: RenderConfig,
  variant: 'landscape_16_9' | 'vertical_9_16'
): string | null {
  if (!renderConfig || typeof renderConfig !== 'object') return null;
  const variants = (renderConfig as Record<string, unknown>).variants;
  if (!Array.isArray(variants)) return null;
  for (const item of variants) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const entry = item as Record<string, unknown>;
    if (String(entry.key || '') !== variant) continue;
    const custom = typeof entry.customThumbnailUrl === 'string' ? entry.customThumbnailUrl.trim() : '';
    if (custom) return custom;
    const frame = typeof entry.thumbnailUrl === 'string' ? entry.thumbnailUrl.trim() : '';
    if (frame) return frame;
    return null;
  }
  return null;
}

export async function uploadThumbnailToYoutube(
  accessToken: string,
  videoId: string,
  thumbnailUrl: string
): Promise<void> {
  const fetchRes = await fetch(thumbnailUrl, { cache: 'no-store' });
  if (!fetchRes.ok) {
    throw new Error(`Failed to fetch thumbnail: ${fetchRes.status}`);
  }
  const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
  const bytes = Buffer.from(await fetchRes.arrayBuffer());
  if (bytes.length > 2 * 1024 * 1024) {
    throw new Error(`Thumbnail too large: ${bytes.length} bytes (max 2MB)`);
  }
  const setRes = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
        'Content-Length': String(bytes.length),
      },
      body: bytes,
    }
  );
  if (!setRes.ok) {
    const text = await setRes.text();
    throw new Error(`thumbnails.set failed (${setRes.status}): ${text}`);
  }
}
