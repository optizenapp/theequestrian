import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getGmcS3Config } from '@/lib/gmc/s3';

export interface MetaCatalogS3UploadResult {
  bucket: string;
  key: string;
  region: string;
  url: string;
  etag?: string;
}

function getEnvValue(...candidates: Array<string | undefined>) {
  return candidates.find((value) => value && value.trim())?.trim();
}

function formatS3Url(bucket: string, region: string, key: string) {
  const safeKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${safeKey}`;
}

export function getMetaCatalogS3Config() {
  const { bucket, region } = getGmcS3Config();
  const key =
    getEnvValue(process.env.META_CATALOG_S3_KEY) || 'meta-catalog.csv';
  return { bucket, region, key };
}

export async function uploadMetaCatalogToS3(csv: string): Promise<MetaCatalogS3UploadResult> {
  const { bucket, region, key } = getMetaCatalogS3Config();
  const client = new S3Client({ region });

  const result = await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: csv,
      ContentType: 'text/csv; charset=utf-8',
      CacheControl: 'public, max-age=900',
    })
  );

  return {
    bucket,
    key,
    region,
    url: formatS3Url(bucket, region, key),
    etag: result.ETag,
  };
}
