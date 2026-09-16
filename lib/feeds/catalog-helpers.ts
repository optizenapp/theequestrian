export function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function formatPrice(amount: string, currencyCode: string) {
  const numeric = Number(amount);
  const normalized = Number.isFinite(numeric) ? numeric.toFixed(2) : amount;
  return `${normalized} ${currencyCode}`;
}

export function getVariantOption(
  variant: { selectedOptions?: Array<{ name: string; value: string }> },
  optionName: string
) {
  const match = variant.selectedOptions?.find(
    (option) => option.name.toLowerCase() === optionName.toLowerCase()
  );
  return match?.value ?? null;
}

export function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

export function findColorSpecificImage(
  images: Array<{ node: { url: string; altText: string | null } }>,
  color: string | null
): string | null {
  if (!color) return null;
  const token = normalizeTag(color);
  const match = images.find(({ node }) => {
    const alt = node.altText ? normalizeTag(node.altText) : '';
    const url = normalizeTag(node.url);
    return alt.includes(token) || url.includes(token);
  });
  return match?.node.url ?? null;
}

export function buildTitle(parts: Array<string | null>) {
  return parts.filter((value) => value && value.trim()).join(' ');
}

export function extractMaterial(tags: string[]): string | null {
  const materials = [
    'leather',
    'synthetic',
    'cotton',
    'wool',
    'nylon',
    'polyester',
    'aramid',
    'linen',
    'silk',
    'denim',
    'canvas',
    'fleece',
  ];
  const match = tags.find((tag) =>
    materials.some((material) => normalizeTag(tag).includes(material))
  );
  return match || null;
}

export function extractPattern(tags: string[]): string | null {
  const patterns = ['striped', 'plaid', 'check', 'polka', 'solid', 'camouflage', 'floral'];
  const match = tags.find((tag) =>
    patterns.some((pattern) => normalizeTag(tag).includes(pattern))
  );
  return match || null;
}

export function extractGender(tags: string[], productType?: string | null): string | null {
  const sources = [...tags, productType || ''];
  const value = sources.find((tag) => {
    const token = normalizeTag(tag);
    return (
      token.includes('women') ||
      token.includes('womens') ||
      token.includes("women's") ||
      token.includes('men') ||
      token.includes('mens') ||
      token.includes("men's") ||
      token.includes('unisex') ||
      token.includes('girl') ||
      token.includes('boy') ||
      token.includes('kids') ||
      token.includes('child')
    );
  });
  if (!value) return null;
  const token = normalizeTag(value);
  if (
    token.includes('women') ||
    token.includes('womens') ||
    token.includes("women's") ||
    token.includes('girl')
  ) {
    return 'female';
  }
  if (
    token.includes('men') ||
    token.includes('mens') ||
    token.includes("men's") ||
    token.includes('boy')
  ) {
    return 'male';
  }
  if (token.includes('kids') || token.includes('child')) return 'kids';
  if (token.includes('unisex')) return 'unisex';
  return null;
}

export function extractAgeGroup(tags: string[], productType?: string | null): string | null {
  const sources = [...tags, productType || ''];
  const value = sources.find((tag) => {
    const token = normalizeTag(tag);
    return (
      token.includes('adult') ||
      token.includes('teen') ||
      token.includes('kids') ||
      token.includes('child') ||
      token.includes('toddler') ||
      token.includes('infant')
    );
  });
  if (!value) return null;
  const token = normalizeTag(value);
  if (token.includes('toddler')) return 'toddler';
  if (token.includes('infant')) return 'infant';
  if (token.includes('kid') || token.includes('child')) return 'kids';
  if (token.includes('teen')) return 'teen';
  return 'adult';
}

function normalizeDigits(value: string | null | undefined): string {
  return (value || '').replace(/\D/g, '');
}

function isValidGtin(value: string): boolean {
  if (!/^\d+$/.test(value)) return false;
  const length = value.length;
  if (![8, 12, 13, 14].includes(length)) return false;
  const digits = value.split('').map(Number);
  const checkDigit = digits.pop()!;
  const reversed = digits.reverse();
  const sum = reversed.reduce((total, digit, index) => {
    const multiplier = index % 2 === 0 ? 3 : 1;
    return total + digit * multiplier;
  }, 0);
  const computed = (10 - (sum % 10)) % 10;
  return computed === checkDigit;
}

export function extractGtin(barcode?: string | null): string | null {
  const digits = normalizeDigits(barcode);
  if (!digits) return null;
  return isValidGtin(digits) ? digits : null;
}

export function extractMpn(sku?: string | null): string | null {
  const trimmed = sku?.trim();
  return trimmed ? trimmed : null;
}

export function stripGid(gid: string) {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

export function collectAdditionalImageUrls(
  images: Array<{ node: { url: string } }>,
  primaryUrl: string,
  max = 20
): string[] {
  const seen = new Set([primaryUrl]);
  const extra: string[] = [];
  for (const { node } of images) {
    if (!node.url || seen.has(node.url)) continue;
    seen.add(node.url);
    extra.push(node.url);
    if (extra.length >= max) break;
  }
  return extra;
}
