import { NextRequest, NextResponse } from 'next/server';

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();

const BOT_UA_RE =
  /(bot|crawler|spider|curl|wget|python-requests|httpclient|scrapy|headless|phantom|lighthouse)/i;

function nowMs() {
  return Date.now();
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get('x-real-ip') ||
    // `request.ip` may be undefined in local dev.
    ((request as unknown as { ip?: string }).ip ?? 'unknown')
  );
}

export function isLikelyBot(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') || '';
  return BOT_UA_RE.test(ua);
}

function gcRateBuckets(now: number) {
  // Opportunistic cleanup to keep in-memory map bounded.
  if (rateBuckets.size < 5000) return;
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) {
      rateBuckets.delete(key);
    }
  }
}

export function checkRateLimit(
  request: NextRequest,
  endpointKey: string,
  maxRequests: number,
  windowMs: number
): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = nowMs();
  gcRateBuckets(now);

  const ip = getClientIp(request);
  const key = `${endpointKey}:${ip}`;
  const bucket = rateBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { ok: true, remaining: Math.max(0, maxRequests - 1) };
  }

  if (bucket.count >= maxRequests) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }

  bucket.count += 1;
  return { ok: true, remaining: Math.max(0, maxRequests - bucket.count) };
}

export function rejectBotRequest(request: NextRequest, endpointLabel: string): NextResponse | null {
  if (!isLikelyBot(request)) return null;
  return NextResponse.json(
    {
      error: 'Automated access blocked for this endpoint',
      endpoint: endpointLabel,
    },
    { status: 403 }
  );
}

