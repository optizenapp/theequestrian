import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface GmcS3UploadResult {
  bucket: string;
  key: string;
  region: string;
  url: string;
  etag?: string;
}

function getEnvValue(...candidates: Array<string | undefined>) {
  return candidates.find((value) => value && value.trim())?.trim();
}

function getPublicReadSetting() {
  const raw = getEnvValue(process.env.GMC_S3_PUBLIC_READ, process.env.S3_PUBLIC_READ);
  if (!raw) return true;
  return raw.toLowerCase() === 'true' || raw === '1' || raw.toLowerCase() === 'yes';
}

function formatS3Url(bucket: string, region: string, key: string) {
  const safeKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${safeKey}`;
}

export function getGmcS3Config() {
  const bucket = getEnvValue(process.env.GMC_S3_BUCKET, process.env.S3_BUCKET);
  if (!bucket) {
    throw new Error('Missing GMC_S3_BUCKET (or S3_BUCKET).');
  }

  const region = getEnvValue(process.env.GMC_S3_REGION, process.env.S3_REGION) || 'ap-southeast-2';
  const key = getEnvValue(process.env.GMC_S3_KEY, process.env.S3_KEY) || 'gmc-feed.xml';

  return {
    bucket,
    region,
    key,
    publicRead: getPublicReadSetting(),
  };
}

export async function uploadGmcFeedToS3(xml: string): Promise<GmcS3UploadResult> {
  const { bucket, region, key } = getGmcS3Config();
  const client = new S3Client({ region });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: xml,
    ContentType: 'application/xml; charset=utf-8',
    CacheControl: 'public, max-age=900',
    // Note: ACL removed - bucket should use bucket policy for public access instead
  });

  const result = await client.send(command);
  return {
    bucket,
    key,
    region,
    url: formatS3Url(bucket, region, key),
    etag: result.ETag,
  };
}
