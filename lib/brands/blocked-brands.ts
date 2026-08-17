import { slugFromBrandName } from '@/lib/brands/brand-slug';

const BLOCKED_BRAND_HANDLES = new Set<string>([
  'rm-williams',
  'penelope',
  'penelope-leprevost',
  'penelope-leprovost',
  // No longer stocked / empty hubs — keep out of brand index + sizing
  'hitchley-harrow',
  'hitchley-and-harrow',
  'plum-tack',
  'lemieux',
]);
const BLOCKED_BRAND_KEYS = new Set<string>([
  'rmwilliams',
  'rmwilliamsn',
  'penelope',
  'penelopeleprevost',
  'penelopeleprovost',
  'hitchleyharrow',
  'hitchleyandharrow',
  'plumtack',
  'lemieux',
]);

function normalizeHandle(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
}

function normalizeBrandKey(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function isBlockedBrandHandle(value?: string | null): boolean {
  if (!value) return false;
  const raw = normalizeHandle(value);
  if (!raw) return false;
  if (BLOCKED_BRAND_HANDLES.has(raw)) return true;
  if (raw.startsWith('brands/')) {
    const slug = raw.slice('brands/'.length).trim();
    return BLOCKED_BRAND_HANDLES.has(slug);
  }
  for (const handle of BLOCKED_BRAND_HANDLES) {
    if (raw.startsWith(`${handle}-`)) return true;
  }
  return false;
}

export function isBlockedBrandName(value?: string | null): boolean {
  if (!value) return false;
  const key = normalizeBrandKey(value);
  if (!key) return false;
  if (BLOCKED_BRAND_KEYS.has(key)) return true;
  return BLOCKED_BRAND_HANDLES.has(slugFromBrandName(value));
}

export function isBlockedBrandCandidate(input: {
  handle?: string | null;
  brand?: string | null;
  vendor?: string | null;
  title?: string | null;
}): boolean {
  return (
    isBlockedBrandHandle(input.handle) ||
    isBlockedBrandName(input.brand) ||
    isBlockedBrandName(input.vendor) ||
    isBlockedBrandText(input.title)
  );
}

export function getBlockedBrandHandles(): string[] {
  return [...BLOCKED_BRAND_HANDLES];
}

export function getBlockedBrandKeys(): string[] {
  return [...BLOCKED_BRAND_KEYS];
}

export function isBlockedBrandText(value?: string | null): boolean {
  if (!value) return false;
  const key = normalizeBrandKey(value);
  if (!key) return false;
  for (const blockedKey of BLOCKED_BRAND_KEYS) {
    if (key.includes(blockedKey)) return true;
  }
  return false;
}
