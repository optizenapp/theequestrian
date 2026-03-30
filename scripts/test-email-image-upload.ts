/**
 * Test script for email template image upload (S3).
 * Run: npx tsx scripts/test-email-image-upload.ts
 * Loads .env.local and attempts a small S3 upload to the same path used by
 * /api/admin/email/templates/upload-image. Use this to see the real error (credentials, bucket, IAM).
 */
import { config } from 'dotenv';
import path from 'path';

// Load .env.local from project root
config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

async function main() {
  console.log('Testing S3 upload (same path as email template image upload)...\n');

  const accessKeyId = (process.env.AWS_ARTICLES_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID)?.trim();
  const secretAccessKey = (
    process.env.AWS_ARTICLES_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY
  )?.trim();
  const bucket =
    process.env.AWS_ARTICLES_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET_NAME ||
    process.env.AWS_S3_BUCKET ||
    'theequestrian-articles-images';
  const region = process.env.AWS_REGION || 'ap-southeast-2';

  console.log('Env check:');
  console.log('  AWS_*_ACCESS_KEY_ID set:', !!accessKeyId);
  console.log('  AWS_*_SECRET_ACCESS_KEY set:', !!secretAccessKey);
  console.log('  Bucket:', bucket === 'theequestrian-articles-images' ? `${bucket} (default)` : bucket);
  console.log('  Region:', region);
  console.log('');

  if (!accessKeyId || !secretAccessKey) {
    console.error(
      'Missing AWS credentials. Set AWS_ARTICLES_ACCESS_KEY_ID and AWS_ARTICLES_SECRET_ACCESS_KEY (or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) in .env.local'
    );
    process.exit(1);
  }

  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    const folder = 'articles/uploads';
    const key = `${folder}/test-email-upload-${Date.now()}.txt`;
    const body = Buffer.from('test upload from scripts/test-email-image-upload.ts');

    console.log('PutObject:', { Bucket: bucket, Key: key });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'text/plain',
      })
    );
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    console.log('Success. URL:', url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === 'object' && 'name' in err ? (err as { name: string }).name : '';
    const statusCode = err && typeof err === 'object' && '$metadata' in err
      ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : '';
    console.error('Upload failed:');
    console.error('  Message:', message);
    if (code) console.error('  Code:', code);
    if (statusCode) console.error('  HTTP status:', statusCode);
    console.error('  Full error:', err);
    process.exit(1);
  }
}

main();
