import * as cheerio from 'cheerio';

export type SocialUrlContext = {
  sourceUrl: string;
  title: string;
  description: string;
  text: string;
  images: string[];
};

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return lower === 'localhost' || lower.endsWith('.local') || /^127\.|^10\.|^192\.168\.|^169\.254\./.test(lower);
}

function absoluteUrl(value: string, base: string): string | null {
  try {
    const parsed = new URL(value, base);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeSourceUrl(raw: string): string {
  const input = raw.trim();
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Only http and https URLs are supported');
  if (isBlockedHost(parsed.hostname)) throw new Error('Private, local, and metadata URLs are not allowed');
  return parsed.toString();
}

export async function loadSocialUrlContext(rawUrl: string): Promise<SocialUrlContext> {
  const sourceUrl = normalizeSourceUrl(rawUrl);
  const response = await fetch(sourceUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': 'TheEquestrianSocialBot/1.0', Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`URL fetch failed: ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) throw new Error('Source URL did not return HTML');
  const html = await response.text();
  const $ = cheerio.load(html);
  $('script,style,noscript,svg').remove();
  const title = ($('meta[property="og:title"]').attr('content') || $('title').first().text()).trim();
  const description = ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').trim();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);
  const candidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    ...$('img').map((_, element) => $(element).attr('src')).get(),
  ];
  const images = Array.from(new Set(candidates.flatMap((item) => item ? [absoluteUrl(item, sourceUrl)] : [])))
    .filter((item): item is string => Boolean(item))
    .filter((item) => !item.endsWith('.svg'))
    .slice(0, 8);
  return { sourceUrl, title, description, text, images };
}

export function buildFallbackSocialCopy(context: SocialUrlContext, platform: string): string {
  const intro = context.description || context.text.slice(0, 220);
  return [
    context.title ? `Take a look at ${context.title}.` : 'Take a look at this update from The Equestrian.',
    intro,
    platform === 'instagram' ? 'See the link for the full details.' : 'View the full details here:',
  ].filter(Boolean).join('\n\n').slice(0, platform === 'instagram' ? 2100 : 4000);
}
