import { SOCIAL_LINKS, STORE_URL } from '@/lib/social/social-links';
import type { CampaignVideoMode } from './types';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

const SALE_TRIGGER = /\b(sale|discount(?:s|ed)?|saving(?:s)?|%\s?off|promo(?:tion(?:al)?)?|clearance|limited[- ]time|exclusive\s+sale|on[- ]sale|deals?|markdown(?:s)?|save\s+(?:up\s+to\s+)?\d+\s*%?|save\s+on)\b/i;

const URL_RE = /https?:\/\//i;

function splitSentences(line: string): string[] {
  const matches = line.match(/[^.!?]+[.!?]+(?:["')\]]+)?|\S[^.!?]*$/g);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [line.trim()];
}

export function stripSaleLanguage(input: string): string {
  if (!input) return input;
  const lines = input.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      out.push('');
      continue;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || URL_RE.test(trimmed)) {
      out.push(line);
      continue;
    }
    const leadingEmojiMatch = trimmed.match(/^(\p{Extended_Pictographic}\s*)/u);
    const leadingEmoji = leadingEmojiMatch ? leadingEmojiMatch[1] : '';
    const body = leadingEmoji ? trimmed.slice(leadingEmoji.length) : trimmed;
    const sentences = splitSentences(body);
    const kept = sentences.filter((s) => !SALE_TRIGGER.test(s));
    if (kept.length === 0) continue;
    const rebuilt = kept.join(' ').replace(/\s{2,}/g, ' ').trim();
    if (!rebuilt) continue;
    out.push(`${leadingEmoji}${rebuilt}`);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function hasOpeningHook(description: string): boolean {
  const firstLine = description.split('\n').find((line) => line.trim().length > 0) || '';
  return firstLine.trim().startsWith('✨');
}

function buildSafeHook(hook: string): string {
  const cleaned = hook.replace(/\s+/g, ' ').trim().replace(/^[✨\s]+/, '');
  if (!cleaned) return '';
  return `✨ ${cleaned}`;
}

const SECTION_EMOJI_RULES: Array<{ test: RegExp; emoji: string }> = [
  { test: /^featured\s+(in\s+this\s+video|products?)\b/i, emoji: '🛍️' },
  { test: /^shop\s+(the\s+)?\S/i, emoji: '🛒' },
  { test: /^browse\s+the\s+store\b/i, emoji: '🌐' },
  { test: /^follow\s+@/i, emoji: '📲' },
];

export function ensureStoreLink(description: string): string {
  if (description.includes(STORE_URL)) return description;
  return `${description.trimEnd()}\n\nBrowse the store: ${STORE_URL}`;
}

export function ensureSocialLinks(description: string): string {
  let next = description;
  const required = [SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook, SOCIAL_LINKS.youtube];
  const missing = required.filter((url) => !next.includes(url));
  if (missing.length === 0) return next;
  const block = ['', 'Follow @theequestrian'];
  for (const url of required) {
    const label =
      url === SOCIAL_LINKS.instagram
        ? 'Instagram'
        : url === SOCIAL_LINKS.facebook
          ? 'Facebook'
          : 'YouTube';
    block.push(`${label}: ${url}`);
  }
  next = `${next.trimEnd()}\n${block.join('\n')}`.trim();
  return next;
}

export function ensureEmojis(description: string): string {
  const lines = description.split('\n');
  const transformed = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (EMOJI_REGEX.test(trimmed)) return line;
    const rule = SECTION_EMOJI_RULES.find((r) => r.test.test(trimmed));
    if (!rule) return line;
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
    return `${indent}${rule.emoji} ${trimmed}`;
  });
  let result = transformed.join('\n');
  if (!EMOJI_REGEX.test(result)) {
    const firstNewline = result.indexOf('\n');
    if (firstNewline === -1) {
      result = `✨ ${result.trim()}`;
    } else {
      result = `✨ ${result.slice(0, firstNewline).trim()}\n${result.slice(firstNewline + 1)}`;
    }
  }
  return result;
}

export function normalizeYoutubeDescription(
  description: string,
  options?: { mode?: CampaignVideoMode; hook?: string | null }
): string {
  let next = description;
  if (options?.mode && options.mode !== 'on_sale_slides_v1') {
    next = stripSaleLanguage(next);
  }
  if (options?.hook && !hasOpeningHook(next)) {
    const safeHook = buildSafeHook(options.hook);
    if (safeHook) next = `${safeHook}\n\n${next}`.trim();
  }
  next = ensureStoreLink(next);
  next = ensureSocialLinks(next);
  next = ensureEmojis(next);
  return next;
}
