import * as cheerio from 'cheerio';

const CARE_PATTERN = /care|wash|clean|launder|machine wash|dry clean/i;

/**
 * Returns plain text for a "Care" style subsection if the HTML has a matching heading.
 */
export function extractCareSectionPlainText(html: string): string | null {
  if (!html || !html.trim()) return null;
  try {
    const $ = cheerio.load(html);
    const heading = $('h2, h3').filter((_, el) => CARE_PATTERN.test($(el).text())).first();
    if (!heading.length) return null;

    const parts: string[] = [];
    let $cursor = heading.next();
    while ($cursor.length && !$cursor.is('h1, h2, h3')) {
      const t = $cursor.text().trim();
      if (t) parts.push(t);
      $cursor = $cursor.next();
    }
    const combined = parts.join(' ').replace(/\s+/g, ' ').trim();
    return combined.length > 0 ? combined : null;
  } catch {
    return null;
  }
}
