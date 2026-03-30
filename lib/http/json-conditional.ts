import { NextRequest, NextResponse } from 'next/server';
import { entityTag, ifNoneMatchSatisfied } from '@/lib/http/conditional-response';

/**
 * JSON response with strong ETag; returns 304 when If-None-Match matches.
 */
export function jsonWithEtag(
  request: NextRequest,
  data: unknown,
  init?: { headers?: Record<string, string> }
): NextResponse {
  const body = JSON.stringify(data);
  const etag = entityTag(body);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ETag: etag,
    ...(init?.headers ?? {}),
  };
  if (ifNoneMatchSatisfied(request.headers.get('if-none-match'), etag)) {
    return new NextResponse(null, { status: 304, headers });
  }
  return new NextResponse(body, { status: 200, headers });
}
