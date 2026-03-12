import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'yorkshire-2026-assets-uk';
const S3_REGION = process.env.AWS_REGION || 'eu-west-2';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Allowed document types
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admins and B2B members
    if (session.user.role !== 'ADMIN' && session.user.role !== 'B2B_MEMBER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const fileExtension = ALLOWED_TYPES[file.type];
    if (!fileExtension) {
      return NextResponse.json(
        { error: 'File must be a PDF, DOC, or DOCX document' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Sanitize
      .substring(0, 50); // Limit length
    const filename = `articles/documents/${timestamp}-${safeName}.${fileExtension}`;

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
        ContentDisposition: `attachment; filename="${file.name}"`,
        CacheControl: 'public, max-age=31536000',
      })
    );

    // Construct URL
    const url = `https://${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${filename}`;

    return NextResponse.json({ 
      url, 
      filename,
      originalName: file.name,
      fileType: fileExtension,
      size: file.size
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
