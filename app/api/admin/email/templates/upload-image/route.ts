import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { uploadBufferToS3 } from '@/lib/s3/storage';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be less than 5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || 'image/jpeg';
    // Reuse the proven uploads prefix used by the existing admin article uploader.
    // Some production IAM policies are scoped to articles/* and reject other prefixes.
    const url = await uploadBufferToS3(buffer, 'articles/uploads', contentType);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error && typeof error === 'object' && 'name' in error ? (error as { name: string }).name : '';
    console.error('[email/templates/upload-image]', message, code, error);
    // Expose short detail so you can see cause in Network tab (e.g. "Missing AWS credentials", "Access Denied")
    const detail = message.slice(0, 200);
    return NextResponse.json(
      { error: 'Failed to upload image', detail },
      { status: 500 }
    );
  }
}
