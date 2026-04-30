import type { VideoBrandStyle } from '../brand';
import type { BrandVideoProductRow } from '../brand-video-content';
import type { SlideVariant } from '../video-render-types';
import type { SlideCopy } from '../copy-types';

export type SlideInput = {
  variant: SlideVariant;
  /** Collection handle for category link line (e.g. footwear); null for brand/on_sale */
  categoryHandle: string | null;
  width: number;
  height: number;
  subjectLine: string;
  brandName: string;
  aboutText: string;
  slideCopy: SlideCopy;
  brand: VideoBrandStyle;
  musicPath: string | null;
  siteLogoPath: string | null;
  siteLogoCtaPath: string | null;
  brandLogoPath: string | null;
  product1: BrandVideoProductRow;
  product2: BrandVideoProductRow;
  product3: BrandVideoProductRow;
  /** Optional override for total video duration (seconds). Slide 4 + audio extend to fill. */
  totalDurationSeconds?: number | null;
};

export type Layout = {
  isPortrait: boolean;
  pad: number;
  titleSize: number;
  aboutSize: number;
  ctaSize: number;
  eyebrowSize: number;
  cardRadius: number;
  cardShadow: string;
  surface: string;
  surfaceAlt: string;
  ink: string;
  inkSoft: string;
  accent: string;
  accentInk: string;
  fontFamily: string;
};

export function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function sanitizeFontFamily(family: string): string {
  return family.replace(/['"]/g, '').replace(/\s*,\s*/g, ', ').trim();
}

export function deriveLayout(input: SlideInput): Layout {
  const isPortrait = input.height > input.width;
  return {
    isPortrait,
    pad: isPortrait ? 64 : 88,
    titleSize: isPortrait ? 72 : 84,
    aboutSize: isPortrait ? 36 : 38,
    ctaSize: isPortrait ? 64 : 76,
    eyebrowSize: isPortrait ? 22 : 22,
    cardRadius: 24,
    cardShadow: '0 18px 48px rgba(15, 18, 38, 0.10), 0 4px 12px rgba(15, 18, 38, 0.06)',
    surface: '#FAFAF7',
    surfaceAlt: '#FFFFFF',
    ink: '#1B1F2A',
    inkSoft: '#5C6172',
    accent: input.brand.primary || '#BD7AB3',
    accentInk: '#FFFFFF',
    fontFamily: sanitizeFontFamily(input.brand.fontFamily),
  };
}

export function priceRowHtml(p: BrandVideoProductRow): string {
  const compare =
    p.compareAtDisplay && p.onSale
      ? `<span class="was">${esc(p.compareAtDisplay)}</span>`
      : '';
  return `<span class="price">${esc(p.priceDisplay)}</span>${compare}`;
}

export function saveBadgeHtml(p: BrandVideoProductRow): string {
  if (!p.onSale || !p.saveBadge) return '';
  return `<span class="save-chip">${esc(p.saveBadge)}</span>`;
}

export function letterboxClass(p: BrandVideoProductRow): string {
  if (p.imageAspect === null) return 'pimg fit-cover';
  const a = p.imageAspect;
  if (a > 1.25 || a < 0.8) return 'pimg fit-contain';
  return 'pimg fit-cover';
}
