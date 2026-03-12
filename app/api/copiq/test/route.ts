import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Connection successful',
    timestamp: new Date().toISOString(),
    site: 'The Equestrian',
  });
}
