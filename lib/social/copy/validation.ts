import { ensureEmojis, ensureSocialLinks, ensureStoreLink, stripSaleLanguage } from './normalize';
import type { CampaignVideoMode, SocialVariant, YoutubePostCopy } from './types';

const PROFANITY = /\b(fuck|shit|cunt|bitch|asshole|motherfucker)\b/i;

const BANNED_PHRASES = [
  /\bhand[- ]picked\s+rider\s+essentials\b/i,
  /\blimited[- ]time\s+savings\b/i,
  /\bpremium\s+quality\b/i,
  /\btop[- ]tier\b/i,
  /\bgame[- ]changer\b/i,
  /\bunleash\b/i,
  /\belevate\s+your\b/i,
  /\bdiscover\s+the\s+\S+\s+collection\b/i,
  /\bdon'?t\s+miss\s+out\b/i,
  /\bmust[- ]have\b/i,
  /\bselling\s+fast\b/i,
  /\bhurry\b/i,
];

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 4500;
const TAGS_TOTAL_MAX = 500;
const MAX_TAG_COUNT = 20;
const MAX_HASHTAG_COUNT = 8;

function cleanInline(value: string): string {
  return value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').replace(/[`*_>]/g, '').trim();
}

function cleanDescription(value: string): string {
  const noMd = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  const noCode = noMd.replace(/[`*_>]/g, '');
  const normalisedNewlines = noCode.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');
  return normalisedNewlines
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .trim();
}

function sanitizeHashtag(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleaned) return '';
  return `#${cleaned}`;
}

function ensureShortsTitle(title: string): string {
  if (/#shorts/i.test(title)) return title;
  if (title.length <= TITLE_MAX - 8) return `${title} #Shorts`;
  return title.slice(0, TITLE_MAX - 8).trimEnd() + ' #Shorts';
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

export function validateYoutubeCopy(
  raw: unknown,
  variant: SocialVariant,
  options?: { mode?: CampaignVideoMode }
): { ok: true; copy: YoutubePostCopy } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'not_object' };
  const value = raw as Record<string, unknown>;
  const allowSale = options?.mode === 'on_sale_slides_v1';
  let title = cleanInline(typeof value.title === 'string' ? value.title : '');
  let description = cleanDescription(typeof value.description === 'string' ? value.description : '');
  if (!allowSale) {
    title = stripSaleLanguage(title) || title;
    description = stripSaleLanguage(description);
  }
  const tagsRaw = Array.isArray(value.tags) ? value.tags : [];
  const hashtagsRaw = Array.isArray(value.hashtags) ? value.hashtags : [];
  const tags = tagsRaw.map((item) => cleanInline(String(item || ''))).filter(Boolean).slice(0, MAX_TAG_COUNT);
  const hashtags = hashtagsRaw
    .map((item) => sanitizeHashtag(String(item || '')))
    .filter(Boolean)
    .slice(0, MAX_HASHTAG_COUNT);

  if (!title) return { ok: false, reason: 'missing_title' };
  if (!description) return { ok: false, reason: 'missing_description' };
  if (title.length > TITLE_MAX) return { ok: false, reason: 'title_too_long' };
  if (PROFANITY.test(title) || PROFANITY.test(description)) return { ok: false, reason: 'profanity_detected' };
  if (BANNED_PHRASES.some((re) => re.test(title) || re.test(description))) {
    return { ok: false, reason: 'banned_phrase' };
  }
  const totalTagChars = tags.join(',').length;
  if (totalTagChars > TAGS_TOTAL_MAX) return { ok: false, reason: 'tags_too_long' };

  description = ensureStoreLink(description);
  description = ensureSocialLinks(description);
  description = ensureEmojis(description);
  if (description.length > DESCRIPTION_MAX) return { ok: false, reason: 'description_too_long' };

  const sanitizedHashtags = variant === 'vertical_9_16'
    ? ['#Shorts', ...hashtags.filter((tag) => tag.toLowerCase() !== '#shorts')]
    : hashtags;
  const finalTitle = variant === 'vertical_9_16' ? ensureShortsTitle(title) : title;

  return {
    ok: true,
    copy: {
      variant,
      title: finalTitle,
      description,
      tags,
      hashtags: sanitizedHashtags,
      categoryId: '22',
      privacyStatus: 'public',
      madeForKids: parseBoolean(value.madeForKids),
    },
  };
}
