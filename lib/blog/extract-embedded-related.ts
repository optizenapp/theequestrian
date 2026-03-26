/**
 * Legacy in-body marker format observed in migrated posts:
 * === split content === handle-a, handle-b === split content ===
 *
 * We remove this block from rendered HTML and reuse extracted handles
 * as related product candidates.
 */

const SPLIT_BLOCK_REGEX = /={3}\s*split content\s*={3}([\s\S]*?)={3}\s*split content\s*={3}/gi;

function normalizeHandleList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function extractEmbeddedRelatedHandles(contentHtml: string): {
  cleanedHtml: string;
  relatedHandlesRaw: string | null;
  hasSplitMarker: boolean;
} {
  if (!contentHtml) {
    return { cleanedHtml: contentHtml, relatedHandlesRaw: null, hasSplitMarker: false };
  }

  const extracted: string[] = [];
  let hasSplitMarker = false;

  const cleaned = contentHtml.replace(SPLIT_BLOCK_REGEX, (_match, inside: string) => {
    hasSplitMarker = true;
    extracted.push(...normalizeHandleList(inside || ''));
    return '';
  });

  const unique = [...new Set(extracted)];
  return {
    cleanedHtml: cleaned,
    relatedHandlesRaw: unique.length ? unique.join(', ') : null,
    hasSplitMarker,
  };
}

