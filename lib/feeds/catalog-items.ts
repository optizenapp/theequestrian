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
  type GmcShippingResolution,
} from '@/lib/gmc/feed-shipping';
import { loadProductBrandMapByHandles } from '@/lib/db/product-brand';
import { getCompareAtSalePair } from '@/lib/shopify/product-discount';
import {
  getVendorFreeShippingThreshold,
  loadShippingRates,
  type ShippingRates,
} from '@/lib/shipping/rates';
import {
  buildGmcCustomLabels,
  type GmcCustomLabels,
} from '@/lib/gmc/custom-labels';
import {
  loadVariantEconomicsMap,
  type VariantEconomics,
} from '@/lib/gmc/variant-economics';
import {
  loadTrailraceDemandIndex,
  resolveTrailracePaidDemand,
  type TrailraceDemandIndex,
} from '@/lib/gmc/trailrace-paid-demand';
import type { ProductWithPrimaryCollection, ShopifyVariant } from '@/types/shopify';
import {
  buildTitle,
  collectAdditionalImageUrls,
  extractAgeGroup,
  extractGender,
  extractGtin,
  extractMaterial,
  extractMpn,
  extractPattern,
  findColorSpecificImage,
  formatPrice,
  getVariantOption,
  stripGid,
  stripHtml,
} from '@/lib/feeds/catalog-helpers';

export type CatalogFeedItem = {
  variantId: string;
  productId: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  additionalImageUrls: string[];
  available: boolean;
  currency: string;
  /** List / compare-at when on sale; otherwise the selling price. */
  priceFormatted: string;
  /** Selling price when discounted; otherwise null. */
  salePriceFormatted: string | null;
  brand: string | null;
  productType: string | null;
  googleCategory: string | null;
  gtin: string | null;
  mpn: string | null;
  identifierExists: boolean;
  size: string | null;
  color: string | null;
  gender: string | null;
  ageGroup: string | null;
  material: string | null;
  pattern: string | null;
  shipping: GmcShippingResolution;
  labels: GmcCustomLabels;
};

function buildVariantItem({
  product,
  variant,
  baseUrl,
  canonicalPath,
  googleCategory,
  collectiveLookups,
  brand,
  shippingRates,
  economics,
  trailraceDemand,
}: {
  product: ProductWithPrimaryCollection;
  variant: ShopifyVariant;
  baseUrl: string;
  canonicalPath: string;
  googleCategory: string | null;
  collectiveLookups: Awaited<ReturnType<typeof loadCollectiveShippingLookups>>;
  brand: string | null;
  shippingRates: ShippingRates;
  economics: VariantEconomics | undefined;
  trailraceDemand: TrailraceDemandIndex;
}): CatalogFeedItem | null {
  const productUrl = `${baseUrl}${canonicalPath}`;
  const productImageUrl = product.images.edges[0]?.node.url;
  const description = stripHtml(product.description || product.descriptionHtml || product.title);
  const variantId = stripGid(variant.id);
  const productId = stripGid(product.id);
  const available = product.availableForSale && variant.availableForSale;
  const size = getVariantOption(variant, 'size');
  const color = getVariantOption(variant, 'color');
  const material = extractMaterial(product.tags);
  const pattern = extractPattern(product.tags);
  const gender = extractGender(product.tags, product.productType);
  const ageGroup = extractAgeGroup(product.tags, product.productType);
  const variantImageUrl = variant.image?.url || null;
  const colorFallback = findColorSpecificImage(product.images.edges, color);
  const imageUrl = variantImageUrl || colorFallback || productImageUrl || null;
  const title = buildTitle([brand, product.title, color, size, material]);
  const gtin = extractGtin(variant.barcode);
  const mpn = extractMpn(variant.sku);
  const identifierExists = Boolean(gtin || mpn);
  const variantLink = `${productUrl}?variant=${variantId}`;
  const offerPriceAud = Number(variant.price.amount);
  const freeShippingThresholdAud = getVendorFreeShippingThreshold(
    product.vendor || '',
    shippingRates
  );
  const shipping = resolveGmcShippingFromCollectiveRate({
    tags: product.tags,
    collectiveRate: pickCollectiveRateForVariant({
      lookups: collectiveLookups,
      variantId,
      productId,
    }),
    freeShippingThresholdAud,
    offerPriceAud: Number.isFinite(offerPriceAud) ? offerPriceAud : null,
  });

  if (!imageUrl) return null;

  const currency = variant.price.currencyCode;
  const compareAtAmount =
    variant.compareAtPrice?.amount || product.compareAtPriceRange?.minVariantPrice?.amount;
  const salePair = getCompareAtSalePair(variant.price.amount, compareAtAmount);
  const priceFormatted = salePair
    ? formatPrice(salePair.compareAtAmount, currency)
    : formatPrice(variant.price.amount, currency);
  const salePriceFormatted = salePair
    ? formatPrice(salePair.saleAmount, currency)
    : null;

  const sellingPriceAud = Number(salePair?.saleAmount ?? variant.price.amount);
  const trailraceMatch = resolveTrailracePaidDemand(trailraceDemand, {
    marketplaceVariantId: variantId,
    sku: variant.sku,
    vendor: product.vendor,
    productTitle: product.title,
    variantTitle: variant.title,
    selectedOptions: variant.selectedOptions,
  });
  const labels = buildGmcCustomLabels({
    sellingPriceAud: Number.isFinite(sellingPriceAud) ? sellingPriceAud : NaN,
    tags: product.tags,
    vendor: product.vendor,
    unitCostAud: economics?.unitCostAud ?? null,
    availableForSale: available,
    quantityAvailable: economics?.quantityAvailable ?? null,
    tracked: economics?.tracked ?? null,
    inventoryPolicy: economics?.inventoryPolicy ?? null,
    trailracePaidLabel: trailraceMatch.label,
  });

  return {
    variantId,
    productId,
    title,
    description,
    link: variantLink,
    imageUrl,
    additionalImageUrls: collectAdditionalImageUrls(product.images.edges, imageUrl),
    available,
    currency,
    priceFormatted,
    salePriceFormatted,
    brand,
    productType: product.productType || null,
    googleCategory,
    gtin,
    mpn,
    identifierExists,
    size,
    color,
    gender,
    ageGroup,
    material,
    pattern,
    shipping,
    labels,
  };
}

export async function buildCatalogFeedItems(logPrefix = 'catalog:feed'): Promise<{
  items: CatalogFeedItem[];
  baseUrl: string;
}> {
  const baseUrl = getGmcBaseUrl();
  const allProducts = await getAllProducts();
  const products = await filterPublishedForHeadless(allProducts);
  if (products.length !== allProducts.length) {
    console.log(
      `[${logPrefix}] Headless visibility filter: ${allProducts.length} → ${products.length} products`
    );
  }

  const allVariantIds = products.flatMap((product) =>
    product.variants.edges.map(({ node }) => stripGid(node.id))
  );
  const allProductIds = products.map((product) => stripGid(product.id));
  const allHandles = products.map((product) => product.handle);
  const [urlMap, collectiveLookups, brandMap, shippingRates, economicsMap, trailraceDemand] =
    await Promise.all([
      getProductCanonicalUrls(products),
      loadCollectiveShippingLookups({
        variantIds: allVariantIds,
        productIds: allProductIds,
      }),
      loadProductBrandMapByHandles(allHandles),
      loadShippingRates(),
      loadVariantEconomicsMap(),
      Promise.resolve(loadTrailraceDemandIndex()),
    ]);

  const missingBrandCount = products.filter((product) => !brandMap.has(product.handle)).length;
  console.log(
    `[${logPrefix}] Collective shipping cache: ${collectiveLookups.byVariant.size} variant rows, ${collectiveLookups.byProduct.size} products (${allVariantIds.length} feed variants)`
  );
  console.log(
    `[${logPrefix}] DB brands: ${brandMap.size}/${products.length} products (${missingBrandCount} missing)`
  );
  console.log(
    `[${logPrefix}] Trailrace demand seed: ${trailraceDemand.seedRows.length} converters, ${trailraceDemand.byMarketplaceVariantId.size} mapped TE variants (${trailraceDemand.sourcePeriod})`
  );

  const items = products.flatMap((product) => {
    const canonicalPath = urlMap.get(product.id) ?? `/products/${product.handle}`;
    const googleCategory = getGoogleProductCategory(product.productType, canonicalPath);
    const brand = brandMap.get(product.handle) ?? null;

    return product.variants.edges
      .map(({ node: variant }) =>
        buildVariantItem({
          product,
          variant,
          baseUrl,
          canonicalPath,
          googleCategory,
          collectiveLookups,
          brand,
          shippingRates,
          economics: economicsMap.get(stripGid(variant.id)),
          trailraceDemand,
        })
      )
      .filter((item): item is CatalogFeedItem => item !== null);
  });

  return { items, baseUrl };
}
