/**
 * Resize Shopify CDN image URLs via the `width` query param.
 * Works for both /products/ and /files/ assets.
 */
export function getShopifyImageUrl(url: string, width: number): string {
  if (!url || width <= 0) return url;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('cdn.shopify.com')) {
      return url;
    }

    parsed.searchParams.delete('height');
    parsed.searchParams.delete('crop');
    parsed.searchParams.set('width', String(Math.round(width)));
    return parsed.toString();
  } catch {
    return url;
  }
}
