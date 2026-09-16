import { getMetaCatalogS3Config } from '@/lib/meta/s3';

/** Public S3 URL for Meta Commerce Manager scheduled fetch. */
export function getConfiguredMetaCatalogFeedUrl(): string {
  const explicit = process.env.META_CATALOG_FEED_URL?.trim();
  if (explicit) return explicit;

  const { bucket, region, key } = getMetaCatalogS3Config();
  const safeKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${safeKey}`;
}
