import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "yorkshire-2026-assets-uk";

/**
 * Generate a secure presigned URL for client-side uploads
 * Used by the Dashboard Property Submission Form
 */
export async function getPresignedUploadUrl(
  filename: string, 
  contentType: string,
  folder: string = "property/user-uploads"
) {
  // Create unique filename
  const ext = filename.split('.').pop();
  const uniqueKey = `${folder}/${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "eu-west-2"}.amazonaws.com/${uniqueKey}`;

  return { uploadUrl: url, publicUrl, key: uniqueKey };
}

/**
 * Server-side upload from buffer (for Ingestion Scripts)
 * Used when pulling images from Rightmove API
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  folder: string = "property/ingestion",
  contentType: string = "image/jpeg"
) {
  // Hash content to prevent duplicates
  const hash = crypto.createHash('md5').update(buffer).digest('hex');
  const uniqueKey = `${folder}/${hash}.jpg`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: uniqueKey,
    Body: buffer,
    ContentType: contentType,
    // Add caching headers for performance
    CacheControl: "max-age=31536000", 
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "eu-west-2"}.amazonaws.com/${uniqueKey}`;
}

