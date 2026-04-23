/**
 * Pulls video embeds out of a product description HTML block so they can be
 * rendered in a dedicated full-width container instead of inline within the
 * description. Handles YouTube, Vimeo, Wistia, Loom iframes and HTML5 <video>
 * tags.
 */

export interface ExtractedVideo {
  /** Stable id used as React key (derived from src + index). */
  id: string;
  /** Iframe src URL or the inner HTML5 video markup. */
  type: 'iframe' | 'video';
  /** For iframe: src URL. For video: the inner HTML (sources, etc.) */
  src: string;
  /** Optional title attribute (used for accessibility). */
  title?: string;
  /** Original outerHTML, kept for fallback rendering. */
  rawHtml: string;
}

export interface ExtractVideosResult {
  /** Description HTML with video tags removed. */
  html: string;
  videos: ExtractedVideo[];
}

const VIDEO_HOST_PATTERNS: RegExp[] = [
  /^(?:https?:)?\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//i,
  /^(?:https?:)?\/\/(?:www\.)?youtube\.com\/watch\?/i,
  /^(?:https?:)?\/\/youtu\.be\//i,
  /^(?:https?:)?\/\/player\.vimeo\.com\//i,
  /^(?:https?:)?\/\/(?:www\.)?vimeo\.com\/\d+/i,
  /^(?:https?:)?\/\/fast\.wistia\.(?:com|net)\//i,
  /^(?:https?:)?\/\/[a-z0-9-]+\.wistia\.(?:com|net)\//i,
  /^(?:https?:)?\/\/(?:www\.)?loom\.com\/embed\//i,
];

const IFRAME_PATTERN =
  /<iframe\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>\s*(?:<\/iframe>)?/gi;
const VIDEO_PATTERN = /<video\b[^>]*>[\s\S]*?<\/video>/gi;
const TITLE_ATTR_PATTERN = /\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

function isVideoHost(src: string): boolean {
  return VIDEO_HOST_PATTERNS.some((re) => re.test(src));
}

function extractTitle(rawTag: string): string | undefined {
  const match = rawTag.match(TITLE_ATTR_PATTERN);
  return match ? match[1] ?? match[2] ?? undefined : undefined;
}

/**
 * Returns the description HTML with all recognised video embeds removed
 * along with the extracted video metadata in document order.
 */
export function extractVideosFromHtml(html: string | null | undefined): ExtractVideosResult {
  if (!html) {
    return { html: html ?? '', videos: [] };
  }

  const videos: ExtractedVideo[] = [];
  let cleaned = html;

  cleaned = cleaned.replace(IFRAME_PATTERN, (match, doubleQuoted?: string, singleQuoted?: string) => {
    const src = (doubleQuoted ?? singleQuoted ?? '').trim();
    if (!src || !isVideoHost(src)) {
      return match;
    }
    videos.push({
      id: `iframe-${videos.length}-${src}`,
      type: 'iframe',
      src,
      title: extractTitle(match),
      rawHtml: match,
    });
    return '';
  });

  cleaned = cleaned.replace(VIDEO_PATTERN, (match) => {
    videos.push({
      id: `video-${videos.length}`,
      type: 'video',
      src: match,
      title: extractTitle(match),
      rawHtml: match,
    });
    return '';
  });

  return { html: cleaned, videos };
}
