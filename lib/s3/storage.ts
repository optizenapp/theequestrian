/**
 * S3 storage for article images (Copiq uploads, featured images).
 * Uses article-specific env when set, else fallback to shared AWS_*:
 *   AWS_ARTICLES_ACCESS_KEY_ID, AWS_ARTICLES_SECRET_ACCESS_KEY (or AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 *   AWS_ARTICLES_S3_BUCKET_NAME or AWS_S3_BUCKET_NAME or AWS_S3_BUCKET
 *   AWS_REGION (default ap-southeast-2)
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    const accessKeyId = (
      process.env.AWS_ARTICLES_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID
    )?.trim();
    const secretAccessKey = (
      process.env.AWS_ARTICLES_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY
    )?.trim();
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'Missing AWS credentials for article images. Set AWS_ARTICLES_ACCESS_KEY_ID and AWS_ARTICLES_SECRET_ACCESS_KEY (or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) in .env.local.'
      );
    }
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    const sessionToken = (process.env.AWS_SESSION_TOKEN ?? '').trim() || undefined;
    _s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey, ...(sessionToken && { sessionToken }) },
    });
  }
  return _s3Client;
}

function getBucketName(): string {
  const raw =
    process.env.AWS_ARTICLES_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    '';
  return raw && raw !== 'articles' ? raw : 'theequestrian-articles-images';
}

/**
 * Server-side upload from buffer (e.g. Copiq image ingestion).
 * Default key strategy is content-addressed (md5) so identical bytes
 * dedupe to a single object. Pass `forceUnique: true` for assets that
 * must be cache-busted on every upload (e.g. regenerated videos/music).
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  folder: string = 'articles/copiq',
  contentType: string = 'image/jpeg',
  options: { forceUnique?: boolean; slug?: string } = {}
): Promise<string> {
  const ext = contentType.split('/')[1] || 'jpg';
  const cleanSlug = options.slug ? options.slug.replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(0, 80) : '';
  const slugPrefix = cleanSlug ? `${cleanSlug}-` : '';
  const uniqueKey = options.forceUnique
    ? `${folder}/${slugPrefix}${Date.now()}-${crypto.randomUUID()}.${ext}`
    : `${folder}/${slugPrefix}${crypto.createHash('md5').update(buffer).digest('hex')}.${ext}`;
  const bucket = getBucketName();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uniqueKey,
    Body: buffer,
    ContentType: contentType,
    CacheControl: options.forceUnique ? 'no-cache, max-age=0' : 'max-age=31536000',
  });

  await client.send(command);
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  return `https://${bucket}.s3.${region}.amazonaws.com/${uniqueKey}`;
}

/**
 * Generate a presigned URL for client-side uploads.
 */
export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
  folder: string = 'articles/uploads'
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const ext = filename.split('.').pop() || 'jpg';
  const uniqueKey = `${folder}/${crypto.randomUUID()}.${ext}`;
  const bucket = getBucketName();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uniqueKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${uniqueKey}`;
  return { uploadUrl, publicUrl, key: uniqueKey };
}

const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);

/**
 * List image keys in the article bucket (optionally under a prefix).
 * Returns public URLs for use in the editor.
 */
export async function listArticleImages(
  prefix: string = 'articles/',
  maxKeys: number = 200
): Promise<{ url: string; key: string }[]> {
  const bucket = getBucketName();
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  const client = getS3Client();
  const out: { url: string; key: string }[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ContinuationToken: continuationToken,
    });
    const response = await client.send(command);
    const items = response.Contents ?? [];
    for (const item of items) {
      const key = item.Key;
      const ext = key?.split('.').pop()?.toLowerCase();
      if (!key || !ext || !IMAGE_EXT.has(ext)) continue;
      out.push({
        key,
        url: `https://${bucket}.s3.${region}.amazonaws.com/${key}`,
      });
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  // Newest first (S3 list is arbitrary; we don't have LastModified in type for sort)
  return out;
}
