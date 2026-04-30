import { loadLogoBuffer } from './brand';
import type { CampaignVideoRow } from './campaign-video-context';

export type BrandVideoProductRow = {
  title: string;
  priceDisplay: string;
  compareAtDisplay: string | null;
  onSale: boolean;
  saveBadge: string | null;
  imageBuffer: Buffer | null;
  imageAspect: number | null;
  vendor: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function trimToSentences(text: string, maxSentences: number): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length === 0) return text.trim();
  return parts.slice(0, maxSentences).join(' ').trim();
}

export function extractBrandAboutFromTemplateBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  const priority = ['text', 'llmIntro', 'heading'] as const;
  for (const type of priority) {
    for (const raw of blocks) {
      const block = raw as Record<string, unknown>;
      if (!block || block.type !== type || typeof block.text !== 'string') continue;
      const cleaned = stripHtml(block.text).trim();
      if (cleaned.length < 24) continue;
      return trimToSentences(cleaned, 2);
    }
  }
  return '';
}

function toProperCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function sanitizeBrandName(value: string): string {
  const cleaned = value
    .replace(/[^\p{L}\p{N}&'\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? toProperCase(cleaned) : '';
}

function extractBrandFromCampaignName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const afterColon = trimmed.replace(/^auto\s*:\s*/i, '');
  const afterEm = afterColon.split(/\s+[—–]\s+/);
  if (afterEm.length >= 2) {
    const candidate = afterEm[1].trim();
    const beforeDate = candidate.split(/\s+[–-]\s+(?:mon|tue|wed|thu|fri|sat|sun|\d)/i)[0];
    return beforeDate.trim();
  }
  return '';
}

function extractBrandFromSubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) return '';
  const beforeColon = trimmed.split(/\s*:\s*/)[0]?.trim();
  if (beforeColon && beforeColon.length > 1 && beforeColon.length < 60) return beforeColon;
  const beforeEm = trimmed.split(/\s*[—–|]\s*/)[0]?.trim();
  if (beforeEm && beforeEm.length > 1 && beforeEm.length < 60) return beforeEm;
  return '';
}

export function resolveBrandNameForVideo(
  campaign: CampaignVideoRow,
  products: BrandVideoProductRow[]
): string {
  const meta = campaign.metadata;
  if (meta && typeof meta.brandName === 'string' && meta.brandName.trim()) {
    const explicit = sanitizeBrandName(meta.brandName);
    if (explicit) return explicit;
  }
  const fromName = sanitizeBrandName(extractBrandFromCampaignName(campaign.name || ''));
  if (fromName) return fromName;
  const fromSubject = sanitizeBrandName(extractBrandFromSubject(campaign.template_subject || ''));
  if (fromSubject) return fromSubject;
  const vendor = products[0]?.vendor?.trim();
  if (vendor) {
    const normalizedVendor = sanitizeBrandName(vendor);
    if (normalizedVendor) return normalizedVendor;
  }
  return 'Brand';
}

export async function loadSiteLogoForBrandVideo(): Promise<Buffer | null> {
  return loadLogoBuffer();
}

export { loadBrandVideoProducts, padProductsToThree } from './brand-video-products';
