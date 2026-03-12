import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'yorkshire-2026-assets-uk';
const S3_REGION = process.env.AWS_REGION || 'eu-west-2';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'B2B_MEMBER' && session.user.role !== 'B2B_USER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimize image with sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const folder = formData.get('folder') as string || 'articles';
    const timestamp = Date.now();
    const filename = `${folder}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
      })
    );

    // Construct URL
    const url = `https://${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${filename}`;

    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
