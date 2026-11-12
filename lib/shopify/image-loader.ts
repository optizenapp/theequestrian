import type { ImageLoaderProps } from 'next/image';
import { getShopifyImageUrl } from './image-url';

/**
 * next/image loader that resizes on Shopify's CDN instead of Vercel Image
 * Optimization. Non-Shopify URLs are returned unchanged.
 */
export function shopifyImageLoader({ src, width }: ImageLoaderProps): string {
  return getShopifyImageUrl(src, width);
}
