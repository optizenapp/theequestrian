import { createHash } from 'node:crypto';

const EMAIL_HASH_PARAM = 'sd_eh';

export function hashEmailForLinks(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

function storeHosts(siteUrl: string): Set<string> {
  try {
    const host = new URL(siteUrl).hostname.toLowerCase();
    const apex = host.replace(/^www\./, '');
    return new Set([host, apex, `www.${apex}`]);
  } catch {
    return new Set();
  }
}

/**
 * Adds sd_eh (SHA-256 of the recipient email) to links that point at the storefront, for
 * Stitch Stack visitor matching. Never puts the plain email in a URL. Must run after
 * addUtmParamsToEmailHtml, which normalises hrefs to absolute URLs.
 */
export function addEmailHashToStoreLinks(html: string, email: string, siteUrl: string): string {
  const hosts = storeHosts(siteUrl);
  if (!email.trim() || hosts.size === 0) return html;
  const emailHash = hashEmailForLinks(email);
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, rawHref: string) => {
    if (rawHref.includes('unsubscribe')) return match;
    try {
      const url = new URL(rawHref.replace(/&amp;/g, '&'));
      if (!hosts.has(url.hostname.toLowerCase()) || url.searchParams.has(EMAIL_HASH_PARAM)) return match;
      url.searchParams.set(EMAIL_HASH_PARAM, emailHash);
      return `href="${url.toString().replace(/&/g, '&amp;')}"`;
    } catch {
      return match;
    }
  });
}
