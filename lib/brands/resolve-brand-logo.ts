import { existsSync } from 'fs';
import { resolve } from 'path';

export function resolveBrandLogoUrl(brand: {
  handle: string;
  logo_url?: string | null;
}): string | null {
  if (brand.logo_url?.trim()) return brand.logo_url.trim();
  return `/brands/logos/${brand.handle}.png`;
}

/** Absolute logo URL for schema/OG only when the asset actually exists. */
export function resolveExistingBrandLogoAbsoluteUrl(
  brand: { handle: string; logo_url?: string | null },
  siteUrl: string
): string | null {
  const trimmed = brand.logo_url?.trim();
  if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed;

  const rel = trimmed?.startsWith('/')
    ? trimmed
    : `/brands/logos/${brand.handle}.png`;
  const fsPath = resolve(process.cwd(), 'public', rel.replace(/^\//, ''));
  if (!existsSync(fsPath)) return null;

  return `${siteUrl.replace(/\/+$/, '')}${rel}`;
}
