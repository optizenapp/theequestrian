export function resolveBrandLogoUrl(brand: {
  handle: string;
  logo_url?: string | null;
}): string | null {
  if (brand.logo_url?.trim()) return brand.logo_url.trim();
  return `/brands/logos/${brand.handle}.png`;
}
