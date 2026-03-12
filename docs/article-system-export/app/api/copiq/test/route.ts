import { NextRequest, NextResponse } from 'next/server';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';

/**
 * GET /api/copiq/test
 * 
 * Test connection endpoint for Copiq integration.
 * Used by Copiq to verify API key and connection before publishing articles.
 * 
 * Headers:
 *   Authorization: Bearer <api_key>
 * 
 * Returns:
 *   200: { success: true, message: "Connection successful", timestamp: "..." }
 *   401: { code: "UNAUTHORIZED", message: "Invalid API key" }
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { 
        code: 'UNAUTHORIZED', 
        message: 'Invalid API key' 
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Connection successful',
    timestamp: new Date().toISOString(),
    site: 'Yorkshire.com',
  });
}
