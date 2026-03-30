/**
 * When article metafields omit `cta_path`, infer a shop destination from tags (and title keywords).
 */

const TAG_RULES: Array<{ test: RegExp; path: string; label: string }> = [
  { test: /boot|boots|footwear|jodhpur|paddock/i, path: '/clothing/footwear', label: 'Shop riding boots' },
  { test: /helmet|mips|skull cap/i, path: '/rider/helmets', label: 'Shop riding helmets' },
  { test: /bridle|bitless|rein/i, path: '/horse/tack/bridles', label: 'Shop bridles & reins' },
  { test: /saddle|girth|stirrup/i, path: '/horse/saddles', label: 'Shop saddlery' },
  { test: /rain.?scald|greasy.?heel|mud.?fever|dermatophil/i, path: '/horse/veterinary', label: 'Shop horse health' },
  { test: /worm|worming|drench/i, path: '/horse/veterinary', label: 'Shop wormers' },
  { test: /ulcer|gastro|omeprazole/i, path: '/horse/stable/feed', label: 'Shop digestive care' },
  { test: /msm|methylsulfonyl|supplement|joint/i, path: '/horse/stable/feed', label: 'Shop horse supplements' },
  { test: /bran|feed|forage|fibre/i, path: '/horse/stable/feed', label: 'Shop horse feed' },
  { test: /fly.?spray|insect|repellent/i, path: '/horse/grooming', label: 'Shop fly control' },
  { test: /rug|blanket|sheet/i, path: '/horse/rugs', label: 'Shop horse rugs' },
  { test: /dog.*hemp|hemp.*dog|canine/i, path: '/pet/dog', label: 'Shop dog care' },
  { test: /lifespan|old do horses|how long do horses|sleep standing/i, path: '/horse/veterinary', label: 'Shop horse care' },
];

export function resolveCtaFromTagsAndTitle(tags: string[], title: string): { path: string; label: string } | null {
  const haystack = `${tags.join(' ')} ${title}`.trim();
  if (!haystack) return null;
  for (const rule of TAG_RULES) {
    if (rule.test.test(haystack)) {
      return { path: rule.path, label: rule.label };
    }
  }
  return null;
}

export const DEFAULT_BLOG_SHOP_CTA = {
  path: '/horse/veterinary',
  label: 'Shop horse health & care',
} as const;
