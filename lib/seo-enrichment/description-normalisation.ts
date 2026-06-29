const BLOCK_LEVEL_TAGS = /<(p|div|h[1-6]|ul|ol|li|table|blockquote)\b/i;
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z0-9"'])/;

const DEFAULT_BLOCK_WORD_THRESHOLD = 80;

/** Remove the first block-level heading so ProductDescription's H2 is the only section heading. */
export function stripLeadingHeading(html: string): string {
  return html.replace(/^\s*<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>\s*/i, '').trim();
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wrapPlainTextAsParagraphs(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length <= 1) {
    const sentences = trimmed.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
    if (sentences.length <= 1) return `<p>${escapeHtml(trimmed)}</p>`;
    const midpoint = Math.ceil(sentences.length / 2);
    return [
      `<p>${escapeHtml(sentences.slice(0, midpoint).join(' '))}</p>`,
      `<p>${escapeHtml(sentences.slice(midpoint).join(' '))}</p>`,
    ].join('\n');
  }
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Detect a single dense paragraph or plain-text wall with no block structure. */
export function isBlockOfText(html: string, wordThreshold = DEFAULT_BLOCK_WORD_THRESHOLD): boolean {
  const trimmed = html.trim();
  if (!trimmed) return false;

  if (!BLOCK_LEVEL_TAGS.test(trimmed)) {
    return stripHtml(trimmed).split(/\s+/).length >= wordThreshold;
  }

  const paragraphMatches = [...trimmed.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  if (paragraphMatches.length === 1) {
    const wordCount = stripHtml(paragraphMatches[0][1]).split(/\s+/).filter(Boolean).length;
    return wordCount >= wordThreshold;
  }

  return false;
}

function findPlainTextOffsetInHtml(html: string, targetPlainLength: number): number {
  let plainCount = 0;
  let i = 0;
  let inTag = false;

  while (i < html.length && plainCount < targetPlainLength) {
    const char = html[i];
    if (char === '<') {
      inTag = true;
      i += 1;
      continue;
    }
    if (inTag) {
      if (char === '>') inTag = false;
      i += 1;
      continue;
    }
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }
    plainCount += 1;
    i += 1;
  }

  while (i < html.length && /\s/.test(html[i])) i += 1;
  return i;
}

function splitHtmlPreservingInlineTags(innerHtml: string): [string, string] | null {
  const plain = stripHtml(innerHtml);
  const sentences = plain.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 1) return null;

  const midpoint = Math.ceil(sentences.length / 2);
  const firstHalfPlain = sentences.slice(0, midpoint).join(' ');
  const splitAt = findPlainTextOffsetInHtml(innerHtml, firstHalfPlain.length);
  if (splitAt <= 0 || splitAt >= innerHtml.length) return null;

  const part1 = innerHtml.slice(0, splitAt).trim();
  const part2 = innerHtml.slice(splitAt).trim();
  if (!part1 || !part2) return null;
  return [part1, part2];
}

function splitSingleParagraph(html: string): string {
  const match = html.match(/^\s*<p([^>]*)>([\s\S]*?)<\/p>\s*$/i);
  if (!match) return html;

  const attrs = match[1];
  const inner = match[2];
  const parts = splitHtmlPreservingInlineTags(inner);
  if (!parts) return html;

  return [
    `<p${attrs}>${parts[0]}</p>`,
    `<p${attrs}>${parts[1]}</p>`,
  ].join('\n');
}

export interface NormaliseVendorDescriptionResult {
  html: string;
  changed: boolean;
  steps: string[];
}

/**
 * Deterministic layout fix for Collective vendor HTML — no AI, no paraphrasing.
 * 1. Strip leading heading (double-H2 fix)
 * 2. Split block-of-text into multiple paragraphs when detected
 */
export function normaliseVendorDescription(
  html: string,
  options?: { wordThreshold?: number }
): NormaliseVendorDescriptionResult {
  const wordThreshold = options?.wordThreshold ?? DEFAULT_BLOCK_WORD_THRESHOLD;
  const steps: string[] = [];
  let current = html.trim();
  if (!current) return { html: '', changed: false, steps };

  const withoutHeading = stripLeadingHeading(current);
  if (withoutHeading !== current) {
    steps.push('strip_leading_heading');
    current = withoutHeading;
  }

  if (isBlockOfText(current, wordThreshold)) {
    if (BLOCK_LEVEL_TAGS.test(current)) {
      const split = splitSingleParagraph(current);
      if (split !== current) {
        current = split;
        steps.push('split_block_of_text');
      }
    } else {
      current = wrapPlainTextAsParagraphs(current);
      steps.push('split_block_of_text');
    }
  }

  return {
    html: current,
    changed: current !== html.trim(),
    steps,
  };
}
