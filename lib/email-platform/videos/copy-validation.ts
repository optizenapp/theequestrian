import type { SlideCopy, SlideCopyContext } from './copy-types';

const PROFANITY = /\b(fuck|shit|cunt|bitch|asshole|motherfucker)\b/i;

const GENERIC_FILLER = [
  /\bhand[- ]picked\s+rider\s+essentials\b/i,
  /\blimited[- ]time\s+savings\b/i,
  /\blimited\s+stock\s+at\s+sale\s+prices\b/i,
  /\bdiscover\s+the\s+\S+\s+collection\b/i,
  /\bpremium\s+quality\b/i,
  /\btop[- ]tier\b/i,
  /\bgame[- ]changer\b/i,
  /\bunleash\b/i,
  /\belevate\s+your\b/i,
  /\bdon'?t\s+miss\s+out\b/i,
  /\bmust[- ]have\b/i,
  /\bselling\s+fast\b/i,
];

export const SLIDE_COPY_LIMITS: Record<string, number> = {
  's1.eyebrow': 28,
  's1.title': 84,
  's1.subtitle': 84,
  's2.eyebrow': 28,
  's2.title': 72,
  's2.subtitle': 120,
  's2.cta': 56,
  's2.linkText': 84,
  's3.eyebrow': 28,
  's3.title': 72,
  's4.eyebrow': 28,
  's4.title': 72,
  's4.cta': 56,
};

const LIMITS = SLIDE_COPY_LIMITS;

export function validateAndSanitizeSlideCopy(raw: unknown, context?: SlideCopyContext): {
  ok: true;
  copy: SlideCopy;
} | {
  ok: false;
  reason: string;
} {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'not_object' };
  const input = raw as Record<string, unknown>;
  const copy: SlideCopy = {
    s1: {
      eyebrow: req(input, 's1', 'eyebrow'),
      title: req(input, 's1', 'title'),
      subtitle: req(input, 's1', 'subtitle'),
    },
    s2: {
      eyebrow: req(input, 's2', 'eyebrow'),
      title: req(input, 's2', 'title'),
      subtitle: req(input, 's2', 'subtitle'),
      cta: req(input, 's2', 'cta'),
      linkText: normalizeLinkText(rawString(input, 's2', 'linkText')),
    },
    s3: {
      eyebrow: req(input, 's3', 'eyebrow'),
      title: req(input, 's3', 'title'),
    },
    s4: {
      eyebrow: req(input, 's4', 'eyebrow'),
      title: req(input, 's4', 'title'),
      cta: req(input, 's4', 'cta'),
    },
  };

  const checks: Array<[string, string]> = [
    ['s1.eyebrow', copy.s1.eyebrow],
    ['s1.title', copy.s1.title],
    ['s1.subtitle', copy.s1.subtitle],
    ['s2.eyebrow', copy.s2.eyebrow],
    ['s2.title', copy.s2.title],
    ['s2.subtitle', copy.s2.subtitle],
    ['s2.cta', copy.s2.cta],
    ['s3.eyebrow', copy.s3.eyebrow],
    ['s3.title', copy.s3.title],
    ['s4.eyebrow', copy.s4.eyebrow],
    ['s4.title', copy.s4.title],
    ['s4.cta', copy.s4.cta],
  ];
  if (context?.variant !== 'category') {
    checks.push(['s2.linkText', copy.s2.linkText]);
  }

  for (const [k, v] of checks) {
    if (!v) continue;
    if (v.length > LIMITS[k]) return { ok: false, reason: `too_long_${k}` };
    if (PROFANITY.test(v)) return { ok: false, reason: `profanity_${k}` };
  }

  if (copy.s2.title && looksLikeActionCollision(copy.s2.title)) {
    return { ok: false, reason: 'awkward_action_phrase_s2_title' };
  }
  if (copy.s2.cta && looksLikeActionCollision(copy.s2.cta)) {
    return { ok: false, reason: 'awkward_action_phrase_s2_cta' };
  }
  if (copy.s4.title && looksLikeActionCollision(copy.s4.title)) {
    return { ok: false, reason: 'awkward_action_phrase_s4_title' };
  }
  if (copy.s4.cta && looksLikeActionCollision(copy.s4.cta)) {
    return { ok: false, reason: 'awkward_action_phrase_s4_cta' };
  }

  for (const [k, v] of checks) {
    if (!v) continue;
    const match = GENERIC_FILLER.find((re) => re.test(v));
    if (match) return { ok: false, reason: `generic_filler_${k}` };
  }

  if (context?.variant === 'category') {
    copy.s2.linkText = '';
  }

  return { ok: true, copy };
}

function req(input: Record<string, unknown>, top: string, key: string): string {
  return clean(rawString(input, top, key));
}

function rawString(input: Record<string, unknown>, top: string, key: string): string {
  const section = input[top];
  const value = section && typeof section === 'object' ? (section as Record<string, unknown>)[key] : '';
  return typeof value === 'string' ? value : '';
}

function clean(value: string): string {
  const noMd = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  const noCode = noMd.replace(/[`*_#>]/g, ' ');
  const noUrls = noCode.replace(/https?:\/\/\S+/gi, '').replace(/\bwww\.\S+/gi, '');
  return noUrls.replace(/\s+/g, ' ').trim();
}

function normalizeLinkText(value: string): string {
  const trimmed = (value || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

function looksLikeActionCollision(value: string): boolean {
  return /\b(shop|explore|view)\s+the\s+(shop|explore|view)\b/i.test(value);
}

