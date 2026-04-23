import { NextRequest, NextResponse } from 'next/server';
import { entityTag, ifNoneMatchSatisfied, notModifiedResponse } from '@/lib/http/conditional-response';
import { getAllProducts, getProductCanonicalUrls } from '@/lib/shopify/products';
import { getGmcBaseUrl } from '@/lib/gmc/content';
import { getGoogleProductCategory } from '@/lib/gmc/category-mapping';

export const runtime = 'nodejs';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatPrice(amount: string, currencyCode: string) {
  const numeric = Number(amount);
  const normalized = Number.isFinite(numeric) ? numeric.toFixed(2) : amount;
  return `${normalized} ${currencyCode}`;
}

function getVariantOption(variant: { selectedOptions?: Array<{ name: string; value: string }> }, optionName: string) {
  const match = variant.selectedOptions?.find((option) => option.name.toLowerCase() === optionName.toLowerCase());
  return match?.value ?? null;
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function findColorSpecificImage(
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

function buildTitle(parts: Array<string | null>) {
  return parts.filter((value) => value && value.trim()).join(' ');
}

function extractMaterial(tags: string[]): string | null {
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
  const match = tags.find((tag) => materials.some((material) => normalizeTag(tag).includes(material)));
  return match || null;
}

function extractPattern(tags: string[]): string | null {
  const patterns = ['striped', 'plaid', 'check', 'polka', 'solid', 'camouflage', 'floral'];
  const match = tags.find((tag) => patterns.some((pattern) => normalizeTag(tag).includes(pattern)));
  return match || null;
}

function extractGender(tags: string[], productType?: string | null): string | null {
  const sources = [...tags, productType || ''];
  const value = sources.find((tag) => {
    const token = normalizeTag(tag);
    return token.includes('women') || token.includes('womens') || token.includes("women's") ||
      token.includes('men') || token.includes('mens') || token.includes("men's") ||
      token.includes('unisex') || token.includes('girl') || token.includes('boy') ||
      token.includes('kids') || token.includes('child');
  });
  if (!value) return null;
  const token = normalizeTag(value);
  if (token.includes('women') || token.includes('womens') || token.includes("women's") || token.includes('girl')) {
    return 'female';
  }
  if (token.includes('men') || token.includes('mens') || token.includes("men's") || token.includes('boy')) {
    return 'male';
  }
  if (token.includes('kids') || token.includes('child')) {
    return 'kids';
  }
  if (token.includes('unisex')) {
    return 'unisex';
  }
  return null;
}

function extractAgeGroup(tags: string[], productType?: string | null): string | null {
  const sources = [...tags, productType || ''];
  const value = sources.find((tag) => {
    const token = normalizeTag(tag);
    return token.includes('adult') || token.includes('teen') || token.includes('kids') ||
      token.includes('child') || token.includes('toddler') || token.includes('infant');
  });
  if (!value) return null;
  const token = normalizeTag(value);
  if (token.includes('toddler')) return 'toddler';
  if (token.includes('infant')) return 'infant';
  if (token.includes('kid') || token.includes('child')) return 'kids';
  if (token.includes('teen')) return 'teen';
  return 'adult';
}

function extractMarginTier(tags: string[]): string {
  const tag = tags.find((value) => normalizeTag(value).startsWith('margin:'));
  if (tag) {
    const [, raw] = tag.split(':');
    const tier = normalizeTag(raw || '');
    if (tier.includes('high')) return 'high';
    if (tier.includes('medium')) return 'medium';
    if (tier.includes('low')) return 'low';
  }
  return 'unknown';
}

function extractSeasonality(tags: string[]): string {
  const normalized = tags.map(normalizeTag);
  if (normalized.some((tag) => tag.includes('summer'))) return 'summer';
  if (normalized.some((tag) => tag.includes('winter'))) return 'winter';
  if (normalized.some((tag) => tag.includes('spring'))) return 'spring';
  if (normalized.some((tag) => tag.includes('autumn') || tag.includes('fall'))) return 'autumn';
  return 'evergreen';
}

function extractPerformanceBucket(tags: string[]): string {
  const normalized = tags.map(normalizeTag);
  if (normalized.some((tag) => tag.includes('bestseller') || tag.includes('best seller'))) return 'bestseller';
  if (normalized.some((tag) => tag.includes('slow') || tag.includes('slow_mover'))) return 'slow_mover';
  if (normalized.some((tag) => tag.includes('clearance'))) return 'slow_mover';
  return 'unknown';
}

function getPriceTier(amount: string): string {
  const price = Number(amount);
  if (!Number.isFinite(price)) return 'unknown';
  if (price < 50) return 'under_50';
  if (price <= 100) return '50_to_100';
  return 'over_100';
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

function extractGtin(barcode?: string | null): string | null {
  const digits = normalizeDigits(barcode);
  if (!digits) return null;
  return isValidGtin(digits) ? digits : null;
}

function extractMpn(sku?: string | null): string | null {
  const trimmed = sku?.trim();
  return trimmed ? trimmed : null;
}

function stripGid(gid: string) {
  const parts = gid.split('/');
  return parts[parts.length - 1] || gid;
}

const GMC_STUB_CACHE = 'public, max-age=60, s-maxage=60, stale-while-revalidate=120';

export async function GET(request: NextRequest) {
  // Deprecated: Merchant Center should fetch from the S3 feed URL.
  // This endpoint intentionally serves a stub to avoid dual-feed drift.
  const baseUrl = getGmcBaseUrl();

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>The Equestrian Product Feed</title>',
    `<link>${escapeXml(baseUrl)}</link>`,
    '<description>Deprecated endpoint. Use the S3-managed GMC feed URL configured in Merchant Center.</description>',
    '</channel>',
    '</rss>',
  ].join('');

  const etag = entityTag(xml);
  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    ETag: etag,
    'Cache-Control': GMC_STUB_CACHE,
  };
  if (ifNoneMatchSatisfied(request.headers.get('if-none-match'), etag)) {
    return notModifiedResponse(headers) as NextResponse;
  }

  return new NextResponse(xml, { headers });
  
  /* ORIGINAL CODE - WILL BE MOVED TO S3 GENERATION SCRIPT
  const products = await getAllProducts();
  const urlMap = await getProductCanonicalUrls(products);

  const items = products.flatMap((product) => {
    const canonicalPath = urlMap.get(product.id) ?? `/products/${product.handle}`;
    const productUrl = `${baseUrl}${canonicalPath}`;
    const productImageUrl = product.images.edges[0]?.node.url;
    const description = stripHtml(product.description || product.descriptionHtml || product.title);

    return product.variants.edges.map(({ node: variant }) => {
      const variantId = stripGid(variant.id);
      const productId = stripGid(product.id);
      const isAvailable = product.availableForSale && variant.availableForSale;
      const size = getVariantOption(variant, 'size');
      const color = getVariantOption(variant, 'color');
      const material = extractMaterial(product.tags);
      const pattern = extractPattern(product.tags);
      const gender = extractGender(product.tags, product.productType);
      const ageGroup = extractAgeGroup(product.tags, product.productType);
      const brand = product.vendor?.trim() || null;
      const variantImageUrl = variant.image?.url || null;
      const colorFallback = findColorSpecificImage(product.images.edges, color);
      const imageUrl = variantImageUrl || colorFallback || productImageUrl || null;
      const title = buildTitle([brand, product.title, color, size, material]);
      const priceTier = getPriceTier(variant.price.amount);
      const marginTier = extractMarginTier(product.tags);
      const seasonality = extractSeasonality(product.tags);
      const stockPressure = isAvailable ? 'high_stock' : 'low_stock';
      const performanceBucket = extractPerformanceBucket(product.tags);
      const gtin = extractGtin(variant.barcode);
      const mpn = extractMpn(variant.sku);
      const identifierExists = Boolean(gtin || mpn);
      const googleCategory = getGoogleProductCategory(product.productType, canonicalPath);
      const variantLink = `${productUrl}?variant=${variantId}`;

      if (!imageUrl) {
        return '';
      }

      const tags = [
        `<g:id>${escapeXml(variantId)}</g:id>`,
        `<g:item_group_id>${escapeXml(productId)}</g:item_group_id>`,
        `<g:title>${escapeXml(title)}</g:title>`,
        `<g:description>${escapeXml(description)}</g:description>`,
        `<g:link>${escapeXml(variantLink)}</g:link>`,
        `<g:image_link>${escapeXml(imageUrl)}</g:image_link>`,
        `<g:availability>${isAvailable ? 'in_stock' : 'out_of_stock'}</g:availability>`,
        `<g:price>${escapeXml(formatPrice(variant.price.amount, variant.price.currencyCode))}</g:price>`,
        `<g:condition>new</g:condition>`,
        brand ? `<g:brand>${escapeXml(brand)}</g:brand>` : '',
        product.productType ? `<g:product_type>${escapeXml(product.productType)}</g:product_type>` : '',
        googleCategory ? `<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>` : '',
        gtin ? `<g:gtin>${escapeXml(gtin)}</g:gtin>` : '',
        mpn ? `<g:mpn>${escapeXml(mpn)}</g:mpn>` : '',
        `<g:identifier_exists>${identifierExists ? 'true' : 'false'}</g:identifier_exists>`,
        size ? `<g:size>${escapeXml(size)}</g:size>` : '',
        color ? `<g:color>${escapeXml(color)}</g:color>` : '',
        gender ? `<g:gender>${escapeXml(gender)}</g:gender>` : '',
        ageGroup ? `<g:age_group>${escapeXml(ageGroup)}</g:age_group>` : '',
        material ? `<g:material>${escapeXml(material)}</g:material>` : '',
        pattern ? `<g:pattern>${escapeXml(pattern)}</g:pattern>` : '',
        `<g:custom_label_0>${escapeXml(priceTier)}</g:custom_label_0>`,
        `<g:custom_label_1>${escapeXml(marginTier)}</g:custom_label_1>`,
        `<g:custom_label_2>${escapeXml(seasonality)}</g:custom_label_2>`,
        `<g:custom_label_3>${escapeXml(stockPressure)}</g:custom_label_3>`,
        `<g:custom_label_4>${escapeXml(performanceBucket)}</g:custom_label_4>`,
      ].filter(Boolean);

      return `<item>${tags.join('')}</item>`;
    });
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>The Equestrian Product Feed</title>',
    `<link>${escapeXml(baseUrl)}</link>`,
    '<description>Dynamic feed for Google Merchant Center</description>',
    ...items.filter(Boolean),
    '</channel>',
    '</rss>',
  ].join('');

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
  */
}
