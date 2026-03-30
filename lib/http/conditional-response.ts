import { createHash } from 'crypto';

/** Strong ETag (quoted base64url sha256) for full response bodies. */
export function entityTag(body: string): string {
  const hash = createHash('sha256').update(body, 'utf8').digest('base64url');
  return `"${hash}"`;
}

function normalizeEtagToken(token: string): string {
  const t = token.trim();
  if (t.startsWith('W/')) return t.slice(2).trim();
  return t;
}

/**
 * Returns true if the client sent If-None-Match matching our ETag (supports * and multiple tokens).
 */
function stripQuotes(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

export function ifNoneMatchSatisfied(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch || !etag) return false;
  // Ignore "*" on safe methods — avoids accidental blanket 304.
  if (ifNoneMatch.trim() === '*') return false;
  const server = stripQuotes(etag);
  const tokens = ifNoneMatch.split(',').map((s) => stripQuotes(normalizeEtagToken(s)));
  return tokens.some((t) => t === server);
}

const HTTP_DATE = /^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

/**
 * If-Modified-Since satisfied when client date is >= server Last-Modified (second precision).
 */
export function ifModifiedSinceNotModified(
  ifModifiedSince: string | null,
  lastModified: Date
): boolean {
  if (!ifModifiedSince || !HTTP_DATE.test(ifModifiedSince.trim())) return false;
  const clientTime = Date.parse(ifModifiedSince);
  if (!Number.isFinite(clientTime)) return false;
  const serverTime = Math.floor(lastModified.getTime() / 1000) * 1000;
  return clientTime >= serverTime;
}

/** 304 with echoed validators (ETag required; Last-Modified optional). */
export function notModifiedResponse(headers: Record<string, string>): Response {
  return new Response(null, { status: 304, headers });
}
