import type { SocialChannel, SocialPostRow } from './repository';
import type { SocialVariant } from './copy/types';

export type SocialPostSibling = {
  channel: SocialChannel;
  variant: SocialVariant;
  externalUrl: string;
};

export type CurrentPostKey = {
  channel: SocialChannel;
  variant: SocialVariant;
};

export function extractPublishedSiblings(posts: SocialPostRow[]): SocialPostSibling[] {
  const out: SocialPostSibling[] = [];
  for (const p of posts) {
    if (p.status !== 'published') continue;
    if (!p.externalUrl) continue;
    out.push({ channel: p.channel, variant: p.variant, externalUrl: p.externalUrl });
  }
  return out;
}

export function siblingsForCurrent(
  siblings: SocialPostSibling[],
  current: CurrentPostKey
): SocialPostSibling[] {
  return siblings.filter(
    (s) => !(s.channel === current.channel && s.variant === current.variant)
  );
}

function siblingLineFor(sibling: SocialPostSibling): string {
  if (sibling.channel === 'youtube' && sibling.variant === 'vertical_9_16') {
    return `📱 Watch the Short on YouTube: ${sibling.externalUrl}`;
  }
  if (sibling.channel === 'youtube') {
    return `📺 Watch on YouTube: ${sibling.externalUrl}`;
  }
  if (sibling.channel === 'instagram') {
    return `📸 See on Instagram: ${sibling.externalUrl}`;
  }
  if (sibling.channel === 'facebook') {
    return `👥 See on Facebook: ${sibling.externalUrl}`;
  }
  if (sibling.channel === 'twitter') {
    return `🐦 See on X: ${sibling.externalUrl}`;
  }
  return `🔗 Also on social: ${sibling.externalUrl}`;
}

export function buildCrossLinkLines(siblings: SocialPostSibling[]): string[] {
  return siblings.map(siblingLineFor);
}

const FOLLOW_REGEX = /(?:^|\n)([^\n]*?(?:📲\s*)?Follow\s+@theequestrian)/m;

export function injectCrossLinks(description: string, lines: string[]): string {
  if (lines.length === 0) return description;
  const missing = lines.filter((line) => {
    const url = line.split(' ').pop() || '';
    return url ? !description.includes(url) : true;
  });
  if (missing.length === 0) return description;
  const block = missing.join('\n');
  const match = description.match(FOLLOW_REGEX);
  if (!match || typeof match.index !== 'number') {
    return `${description.trimEnd()}\n\n${block}`.trim();
  }
  const insertAt = match.index + (description[match.index] === '\n' ? 1 : 0);
  const before = description.slice(0, insertAt).trimEnd();
  const after = description.slice(insertAt);
  return `${before}\n\n${block}\n\n${after}`.trim();
}
