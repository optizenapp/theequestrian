import * as cheerio from 'cheerio';

const MAX_LEN = 220;

/**
 * First paragraph or stripped body text for PDP value-summary intro line.
 */
export function buildPdpSummaryLine(html: string, displayTitle: string): string {
  if (!html || !html.trim()) {
    return `${displayTitle} — quality gear with Australian delivery.`;
  }
  try {
    const $ = cheerio.load(html);
    const fromP = $('p').first().text().trim();
    const text = fromP || $.root().text().trim();
    const oneLine = text.replace(/\s+/g, ' ').trim();
    if (!oneLine) {
      return `${displayTitle} — quality gear with Australian delivery.`;
    }
    return oneLine.length > MAX_LEN ? `${oneLine.slice(0, MAX_LEN).trim()}…` : oneLine;
  } catch {
    return `${displayTitle} — quality gear with Australian delivery.`;
  }
}
