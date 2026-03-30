import * as cheerio from 'cheerio';

/**
 * Split HTML after the Nth top-level <p> so related products can be rendered between blocks.
 * If there are fewer than N paragraphs, returns { before: full, after: '' }.
 */
export function splitArticleHtmlAfterParagraphs(
  html: string,
  paragraphCount: number = 2
): { before: string; after: string } {
  if (!html) return { before: '', after: '' };

  const $ = cheerio.load(html, undefined, false);
  const contents = $.root().contents().toArray();

  let pCount = 0;
  let splitAfterIndex = -1;
  for (let i = 0; i < contents.length; i++) {
    const n = contents[i];
    if (n.type === 'tag' && n.tagName?.toLowerCase() === 'p') {
      pCount++;
      if (pCount >= paragraphCount) {
        splitAfterIndex = i;
        break;
      }
    }
  }

  if (splitAfterIndex < 0) {
    // Fallback: split by 2nd paragraph close anywhere in HTML.
    const pCloseRegex = /<\/p>/gi;
    let match: RegExpExecArray | null;
    let seen = 0;
    while ((match = pCloseRegex.exec(html))) {
      seen++;
      if (seen >= paragraphCount) {
        const cut = match.index + match[0].length;
        return { before: html.slice(0, cut), after: html.slice(cut) };
      }
    }

    // Secondary fallback: split after first heading close.
    const hCloseRegex = /<\/h[2-4]>/i;
    const headingMatch = html.match(hCloseRegex);
    if (headingMatch && typeof headingMatch.index === 'number') {
      const cut = headingMatch.index + headingMatch[0].length;
      return { before: html.slice(0, cut), after: html.slice(cut) };
    }

    return { before: html, after: '' };
  }

  const beforeParts: string[] = [];
  const afterParts: string[] = [];
  for (let i = 0; i <= splitAfterIndex; i++) {
    beforeParts.push($.html(contents[i]));
  }
  for (let i = splitAfterIndex + 1; i < contents.length; i++) {
    afterParts.push($.html(contents[i]));
  }

  return { before: beforeParts.join(''), after: afterParts.join('') };
}
