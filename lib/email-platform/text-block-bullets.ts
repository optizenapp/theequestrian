/** Markdown-style bullet markers supported in TEXT / LLM Intro blocks. */
const BULLET_LINE_RE = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/;

export const BULLET_PREFIX = '- ';

export function isBulletLine(line: string): boolean {
  return BULLET_LINE_RE.test(line);
}

export function stripBulletMarker(line: string): string | null {
  const match = line.match(BULLET_LINE_RE);
  return match ? match[1] : null;
}

/**
 * Prefix the current line (or each selected line) with "- ".
 * Lines that already have a bullet marker are left unchanged.
 */
export function insertBulletMarker(
  text: string,
  selectionStart: number,
  selectionEnd: number
): { text: string; cursor: number } {
  const value = text ?? '';
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));

  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndSearch = value.indexOf('\n', end);
  const lineEnd = lineEndSearch === -1 ? value.length : lineEndSearch;
  const selected = value.slice(lineStart, lineEnd);
  const lines = selected.split('\n');
  const updatedLines = lines.map((line) => (isBulletLine(line) ? line : `${BULLET_PREFIX}${line}`));
  const updated = updatedLines.join('\n');
  const next = value.slice(0, lineStart) + updated + value.slice(lineEnd);
  const cursor = lineStart + updated.length;
  return { text: next, cursor };
}

/**
 * Continue a bullet list on Enter.
 * - Content after marker → insert a new "- " line
 * - Empty bullet ("- ") → exit the list (remove the empty bullet)
 * Returns null when Enter should use the default textarea behaviour.
 */
export function continueBulletOnEnter(
  text: string,
  selectionStart: number
): { text: string; cursor: number } | null {
  const value = text ?? '';
  const pos = Math.max(0, Math.min(selectionStart, value.length));

  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  const lineEndSearch = value.indexOf('\n', pos);
  const lineEnd = lineEndSearch === -1 ? value.length : lineEndSearch;
  // Only continue when the caret is at the end of the current line
  if (pos !== lineEnd) return null;

  const line = value.slice(lineStart, lineEnd);
  const content = stripBulletMarker(line);
  if (content === null) return null;

  if (content.trim() === '') {
    const after = lineEnd < value.length && value[lineEnd] === '\n' ? lineEnd + 1 : lineEnd;
    const next = value.slice(0, lineStart) + value.slice(after);
    return { text: next, cursor: lineStart };
  }

  const insertion = `\n${BULLET_PREFIX}`;
  const next = value.slice(0, pos) + insertion + value.slice(pos);
  return { text: next, cursor: pos + insertion.length };
}
