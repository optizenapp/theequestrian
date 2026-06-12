import { NextRequest, NextResponse } from 'next/server';
import { buildEntityMap } from '@/lib/entitymap/data';
import { renderEntityMapHtml } from '@/lib/entitymap/render-html';
import { entityTag, ifNoneMatchSatisfied, notModifiedResponse } from '@/lib/http/conditional-response';

export const revalidate = 86400;

const CACHE_CONTROL = 'public, s-maxage=86400, stale-while-revalidate=604800';

export async function GET(request: NextRequest) {
  const body = renderEntityMapHtml(buildEntityMap());
  const etag = entityTag(body);
  const cacheHeaders = { ETag: etag, 'Cache-Control': CACHE_CONTROL };

  if (ifNoneMatchSatisfied(request.headers.get('if-none-match'), etag)) {
    return notModifiedResponse(cacheHeaders) as NextResponse;
  }

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...cacheHeaders,
    },
  });
}
