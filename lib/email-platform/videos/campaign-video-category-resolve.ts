import type { CampaignVideoRow } from './campaign-video-context';

export function resolveCategoryHandle(campaign: CampaignVideoRow): string {
  const raw = campaign.metadata?.categoryCollectionHandle;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'category';
}

export function resolveCategoryCtaUrl(campaign: CampaignVideoRow): string {
  const meta = campaign.metadata;
  if (meta && typeof meta.ctaUrl === 'string' && meta.ctaUrl.trim()) return meta.ctaUrl.trim();
  const h = resolveCategoryHandle(campaign);
  return `https://www.theequestrian.com.au/${h}`;
}

export function resolveCategoryDisplayName(campaign: CampaignVideoRow): string {
  const meta = campaign.metadata || {};
  const handleTitle = titleCaseWords(resolveCategoryHandle(campaign).replace(/-/g, ' '));
  const fromDisplay = typeof meta.categoryDisplayName === 'string' ? meta.categoryDisplayName.trim() : '';
  if (!fromDisplay) return handleTitle;
  const normalized = titleCaseWords(fromDisplay);
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  if (wordCount > 4 || normalized.length > 40) return handleTitle;
  return normalized;
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
