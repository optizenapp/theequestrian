/**
 * S3 storage for article images (Copiq uploads, featured images).
 * Uses AWS SDK and env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '';

/**
 * Server-side upload from buffer (e.g. Copiq image ingestion).
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  folder: string = 'articles/copiq',
  contentType: string = 'image/jpeg'
): Promise<string> {
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  const ext = contentType.split('/')[1] || 'jpg';
  const uniqueKey = `${folder}/${hash}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });

  await s3Client.send(command);
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${uniqueKey}`;
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

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const region = process.env.AWS_REGION || 'ap-southeast-2';
  const publicUrl = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${uniqueKey}`;
  return { uploadUrl, publicUrl, key: uniqueKey };
}
