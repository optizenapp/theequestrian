import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { buildStaticSitemaps } from '@/lib/sitemap/build-static';

export interface SitemapPublishResult {
  bucket: string;
  region: string;
  prefix: string;
  uploadedFiles: number;
  urls: string[];
  counts: {
    static: number;
    categories: number;
    news: number;
    products: number;
    productFiles: number;
  };
}

function env(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

function optionalEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function normalizePrefix(prefix: string): string {
  return prefix.replace(/^\/+/, '').replace(/\/+$/, '');
}

function buildPublicUrl(bucket: string, region: string, key: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

export async function publishSitemapsToS3(): Promise<SitemapPublishResult> {
  const bucket = env('SITEMAP_S3_BUCKET');
  const region = env('SITEMAP_S3_REGION', 'ap-southeast-2');
  const prefix = normalizePrefix(env('SITEMAP_S3_PREFIX', 'sitemaps'));
  const customBase = optionalEnv('SITEMAP_PUBLIC_BASE_URL')?.replace(/\/+$/, '') || null;

  const artifacts = await buildStaticSitemaps();
  const client = new S3Client({ region });
  const urls: string[] = [];

  for (const file of artifacts.files) {
    const key = `${prefix}/${file.path}`;
    const isIndex = file.path === 'sitemap.xml';
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.body,
        ContentType: 'application/xml; charset=utf-8',
        CacheControl: isIndex ? 'public, max-age=300' : 'public, max-age=3600',
      })
    );

    urls.push(customBase ? `${customBase}/${file.path}` : buildPublicUrl(bucket, region, key));
  }

  return {
    bucket,
    region,
    prefix,
    uploadedFiles: artifacts.files.length,
    urls,
    counts: artifacts.counts,
  };
}
