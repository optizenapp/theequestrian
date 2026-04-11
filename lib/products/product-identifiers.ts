import type { ShopifyProduct } from '@/types/shopify';

export interface ProductIdentifiers {
  model?: string;
  upc?: string;
  sku?: string;
}

function clean(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function extractTagValue(tags: string[], prefixes: string[]): string | undefined {
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase();
    for (const prefix of prefixes) {
      if (lowerTag.startsWith(prefix)) {
        const value = clean(tag.slice(prefix.length));
        if (value) return value;
      }
    }
  }
  return undefined;
}

function extractMetafieldValue(
  product: ShopifyProduct,
  keys: Array<{ namespace: string; key: string }>
): string | undefined {
  const metafields = product.metafields ?? [];
  for (const candidate of keys) {
    const match = metafields.find(
      (mf) =>
        mf != null &&
        typeof mf.namespace === 'string' &&
        typeof mf.key === 'string' &&
        mf.namespace.toLowerCase() === candidate.namespace.toLowerCase() &&
        mf.key.toLowerCase() === candidate.key.toLowerCase()
    );
    const value = clean(match?.value);
    if (value) return value;
  }
  return undefined;
}

export function getProductIdentifiers(product: ShopifyProduct): ProductIdentifiers {
  const variantEdges = product.variants?.edges ?? [];
  const firstSku = clean(variantEdges.find(({ node }) => clean(node.sku))?.node.sku);
  const firstBarcode = clean(variantEdges.find(({ node }) => clean(node.barcode))?.node.barcode);
  const metafieldModel = extractMetafieldValue(product, [
    { namespace: 'custom', key: 'model' },
    { namespace: 'custom', key: 'model_number' },
    { namespace: 'custom', key: 'mpn' },
    { namespace: 'global', key: 'model' },
    { namespace: 'global', key: 'mpn' },
  ]);
  const metafieldUpcOrGtin = extractMetafieldValue(product, [
    { namespace: 'custom', key: 'upc' },
    { namespace: 'custom', key: 'gtin' },
    { namespace: 'custom', key: 'barcode' },
    { namespace: 'global', key: 'upc' },
    { namespace: 'global', key: 'gtin' },
  ]);

  const normalizedMetafieldUpc =
    metafieldUpcOrGtin && /^\d{8,14}$/.test(metafieldUpcOrGtin) ? metafieldUpcOrGtin : undefined;
  const normalizedBarcode = firstBarcode && /^\d{8,14}$/.test(firstBarcode) ? firstBarcode : undefined;
  const upc = normalizedMetafieldUpc || normalizedBarcode;
  const model =
    metafieldModel || extractTagValue(product.tags, ['model:', 'model number:', 'model no:', 'model#:', 'mpn:']);

  return {
    model,
    upc,
    sku: firstSku,
  };
}
