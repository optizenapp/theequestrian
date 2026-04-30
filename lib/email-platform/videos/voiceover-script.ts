export type VoiceoverScriptKind = 'brand' | 'on_sale' | 'category' | 'site';

const BRAND_TEMPLATES = [
  (subject: string, brand: string) => `${subject}. The ${brand} edit, now at The Equestrian. Have a look.`,
  (subject: string, brand: string) => `Just in: ${subject}. Browse the ${brand} range at The Equestrian.`,
  (subject: string, brand: string) => `${subject}. The ${brand} collection at The Equestrian. Take a look.`,
  (subject: string, brand: string) => `Now showing the ${brand} edit. ${subject}. Only at The Equestrian.`,
];

const SITE_FALLBACK_TEMPLATES = [
  (subject: string) => `${subject}. See what's new at The Equestrian.`,
  (subject: string) => `${subject}. Browse the latest at The Equestrian.`,
  (subject: string) => `Just in: ${subject}. Now at The Equestrian.`,
];

const ON_SALE_TEMPLATES = [
  (subject: string) => `${subject}. The sale edit is live at The Equestrian. Have a look.`,
  (subject: string) => `On sale this week: ${subject}. Now at The Equestrian.`,
  (subject: string) => `${subject}. Refresh your kit in the sale edit at The Equestrian.`,
  (subject: string) => `${subject}. The sale picks are running at The Equestrian. Take a look.`,
];

const CATEGORY_TEMPLATES = [
  (subject: string, category: string) => `${subject}. The ${category} edit, now at The Equestrian. Have a look.`,
  (subject: string, category: string) => `Now showing the ${category} edit. ${subject}. At The Equestrian.`,
  (subject: string, category: string) => `${subject}. Browse the ${category} range at The Equestrian.`,
  (subject: string, category: string) => `${subject}. The latest in ${category} at The Equestrian. Take a look.`,
];

function trimSubject(subject: string): string {
  const cleaned = subject.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (cleaned.length <= 80) return cleaned;
  return cleaned.slice(0, 77).replace(/[\s,;:-]+\S*$/, '') + '…';
}

function pickFromList<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function buildVoiceoverScript(input: {
  subjectLine: string;
  brandName?: string | null;
  kind?: VoiceoverScriptKind;
}): string {
  const subject = trimSubject(input.subjectLine || '');
  if (!subject) return "Discover what's new at The Equestrian.";
  if (input.kind === 'on_sale') return pickFromList(ON_SALE_TEMPLATES)(subject);
  if (input.kind === 'category') {
    const category = (input.brandName || '').trim();
    if (category && category.toLowerCase() !== 'category') {
      return pickFromList(CATEGORY_TEMPLATES)(subject, category);
    }
    return pickFromList(SITE_FALLBACK_TEMPLATES)(subject);
  }
  const brand = (input.brandName || '').trim();
  if (input.kind !== 'site' && brand && brand.toLowerCase() !== 'brand') {
    return pickFromList(BRAND_TEMPLATES)(subject, brand);
  }
  return pickFromList(SITE_FALLBACK_TEMPLATES)(subject);
}
