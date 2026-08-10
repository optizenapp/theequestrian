import {
  filterPublishedForHeadless,
  getAllProducts,
  getProductCanonicalUrls,
} from '@/lib/shopify/products';
import { getGmcBaseUrl } from '@/lib/gmc/content';
import { getGoogleProductCategory } from '@/lib/gmc/category-mapping';
import {
  loadCollectiveShippingLookups,
  pickCollectiveRateForVariant,
  resolveGmcShippingFromCollectiveRate,
  type CollectiveShippingLookups,
} from '@/lib/gmc/feed-shipping';
import type { ProductWithPrimaryCollection, ShopifyVariant } from '@/types/shopify';

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

function getVariantOption(
  variant: { selectedOptions?: Array<{ name: string; value: string }> },
  optionName: string
) {
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

type CommissionGroup = '13' | '9';

const COMMISSION_13_KEYWORDS = [
  'fly veil',
  'flyveils',
  'fly bonnet',
  'fly hood',
  'fly mask',
  'stable',
  'arena',
  'horse accessories',
  'accessories',
  'halter',
  'grooming',
  'bridle',
  'strapping',
];

const COMMISSION_9_KEYWORDS = [
  'bit',
  'boots',
  'footwear',
  'helmet',
  'rug',
  'clipper',
  'pet',
  'saddle pad',
  'saddlecloth',
  'toy',
  'jewellery',
  'jewelry',
  'health',
  'nutrition',
  'feed',
  'body protector',
  'safety vest',
  'riding',
  'clothing',
  'jodhpur',
  'breeches',
];

function hasKeywordMatch(haystacks: string[], keywords: string[]) {
  return keywords.some((keyword) => haystacks.some((value) => value.includes(keyword)));
}

function resolveCommissionGroup(productType: string | null | undefined, canonicalPath: string, tags: string[]): CommissionGroup {
  const searchSpace = [
    normalizeTag(productType || ''),
    normalizeTag(canonicalPath.replace(/\//g, ' ')),
    ...tags.map(normalizeTag),
  ];

  if (hasKeywordMatch(searchSpace, COMMISSION_13_KEYWORDS)) {
    return '13';
  }

  // Non-13 groups (including legacy 11/10/7/6.5/5) are treated with 9% logic.
  if (hasKeywordMatch(searchSpace, COMMISSION_9_KEYWORDS)) {
    return '9';
  }

  return '9';
}

function resolveCommissionTier(group: CommissionGroup, amount: string): string {
  const price = Number(amount);
  if (!Number.isFinite(price)) {
    return 'do_not_advertise';
  }

  if (group === '13') {
    if (price >= 100) return 'tier_1';
    if (price >= 40) return 'tier_2';
    return 'do_not_advertise';
  }

  if (price >= 300) return 'tier_3';
  return 'do_not_advertise';
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

function buildVariantItem({
  product,
  variant,
  baseUrl,
  canonicalPath,
  googleCategory,
  collectiveLookups,
}: {
  product: ProductWithPrimaryCollection;
  variant: ShopifyVariant;
  baseUrl: string;
  canonicalPath: string;
  googleCategory: string | null;
  collectiveLookups: CollectiveShippingLookups;
}): { xml: string; variantId: string } | null {
  const productUrl = `${baseUrl}${canonicalPath}`;
  const productImageUrl = product.images.edges[0]?.node.url;
  const description = stripHtml(product.description || product.descriptionHtml || product.title);
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
  const commissionGroup = resolveCommissionGroup(product.productType, canonicalPath, product.tags);
  const commissionTier = resolveCommissionTier(commissionGroup, variant.price.amount);
  const stockPressure = isAvailable ? 'high_stock' : 'low_stock';
  const performanceBucket = extractPerformanceBucket(product.tags);
  const gtin = extractGtin(variant.barcode);
  const mpn = extractMpn(variant.sku);
  const identifierExists = Boolean(gtin || mpn);
  const variantLink = `${productUrl}?variant=${variantId}`;
  const shipping = resolveGmcShippingFromCollectiveRate({
    tags: product.tags,
    collectiveRate: pickCollectiveRateForVariant({
      lookups: collectiveLookups,
      variantId,
      productId,
    }),
  });

  if (!imageUrl) {
    return null;
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
    shipping.shippingXml,
    `<g:custom_label_0>${escapeXml(priceTier)}</g:custom_label_0>`,
    `<g:custom_label_1>${escapeXml(marginTier)}</g:custom_label_1>`,
    `<g:custom_label_2>${escapeXml(commissionTier)}</g:custom_label_2>`,
    `<g:custom_label_3>${escapeXml(stockPressure)}</g:custom_label_3>`,
    `<g:custom_label_4>${escapeXml(performanceBucket)}</g:custom_label_4>`,
  ].filter(Boolean);

  return { xml: `<item>${tags.join('')}</item>`, variantId };
}

export async function buildGmcFeedXml() {
  const baseUrl = getGmcBaseUrl();
  const allProducts = await getAllProducts();
  const products = await filterPublishedForHeadless(allProducts);
  if (products.length !== allProducts.length) {
    console.log(
      `[gmc:feed] Headless visibility filter: ${allProducts.length} → ${products.length} products`
    );
  }

  const allVariantIds = products.flatMap((product) =>
    product.variants.edges.map(({ node }) => stripGid(node.id))
  );
  const allProductIds = products.map((product) => stripGid(product.id));
  const [urlMap, collectiveLookups] = await Promise.all([
    getProductCanonicalUrls(products),
    loadCollectiveShippingLookups({
      variantIds: allVariantIds,
      productIds: allProductIds,
    }),
  ]);
  console.log(
    `[gmc:feed] Collective shipping cache: ${collectiveLookups.byVariant.size} variant rows, ${collectiveLookups.byProduct.size} products (${allVariantIds.length} feed variants)`
  );

  const built = products.flatMap((product) => {
    const canonicalPath = urlMap.get(product.id) ?? `/products/${product.handle}`;
    const googleCategory = getGoogleProductCategory(product.productType, canonicalPath);

    return product.variants.edges
      .map(({ node: variant }) =>
        buildVariantItem({
          product,
          variant,
          baseUrl,
          canonicalPath,
          googleCategory,
          collectiveLookups,
        })
      )
      .filter((item): item is { xml: string; variantId: string } => item !== null);
  });

  const validItems = built.map((item) => item.xml);
  const variantIds = built.map((item) => item.variantId);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    '<title>The Equestrian Product Feed</title>',
    `<link>${escapeXml(baseUrl)}</link>`,
    '<description>Dynamic feed for Google Merchant Center</description>',
    ...validItems,
    '</channel>',
    '</rss>',
  ].join('');

  return { xml, itemCount: validItems.length, variantIds };
}
