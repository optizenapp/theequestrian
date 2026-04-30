import { getProductByHandle } from '@/lib/shopify/products';
import type { ShopifyProduct } from '@/types/shopify';
import type { BrandVideoProductRow } from './brand-video-content';

function buildSaveBadge(price: number, compareAt: number | null): string | null {
  if (compareAt === null || Number.isNaN(compareAt) || compareAt <= price) return null;
  const diff = compareAt - price;
  const pct = Math.round((diff / compareAt) * 100);
  if (pct >= 10) return `Save ${pct}%`;
  return `Save $${diff.toFixed(diff < 10 ? 2 : 0)}`;
}

function upscaleShopifyImageUrl(url: string, targetWidth: number): string {
  if (!/cdn\.shopify\.com/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('width', String(targetWidth));
    return parsed.toString();
  } catch {
    return url;
  }
}

function formatMoney(amount: string, currencyCode: string): string {
  const n = Number.parseFloat(amount);
  if (Number.isNaN(n)) return amount;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currencyCode || 'AUD',
  }).format(n);
}

function mapProductForBrandVideo(product: ShopifyProduct): BrandVideoProductRow {
  const currency = product.priceRange.minVariantPrice.currencyCode;
  const priceAmt = product.priceRange.minVariantPrice.amount;
  const compareAmt = product.compareAtPriceRange?.minVariantPrice?.amount;
  const priceNum = Number.parseFloat(priceAmt);
  const compareNum = compareAmt ? Number.parseFloat(compareAmt) : NaN;
  const onSale = Boolean(compareAmt && !Number.isNaN(compareNum) && compareNum > priceNum);
  const saveBadge = onSale ? buildSaveBadge(priceNum, compareNum) : null;
  return {
    title: product.title,
    priceDisplay: formatMoney(priceAmt, currency),
    compareAtDisplay:
      compareAmt && !Number.isNaN(compareNum) ? formatMoney(compareAmt, currency) : null,
    onSale,
    saveBadge,
    imageBuffer: null,
    imageAspect: null,
    vendor: product.vendor || '',
  };
}

async function fetchPrimaryImage(
  product: ShopifyProduct
): Promise<{ buffer: Buffer; aspect: number | null } | null> {
  const node = product.images?.edges?.[0]?.node;
  const rawUrl = node?.url;
  if (!rawUrl) {
    console.warn(`[brand-video-products] no image url for handle="${product.handle}"`);
    return null;
  }
  const url = upscaleShopifyImageUrl(rawUrl, 1600);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(
        `[brand-video-products] image fetch failed status=${response.status} handle="${product.handle}" url=${url}`
      );
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const w = node?.width ?? 0;
    const h = node?.height ?? 0;
    const aspect = w > 0 && h > 0 ? w / h : null;
    return { buffer, aspect };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn(`[brand-video-products] image fetch threw handle="${product.handle}" error=${message}`);
    return null;
  }
}

export async function loadBrandVideoProducts(handles: string[]): Promise<BrandVideoProductRow[]> {
  const out: BrandVideoProductRow[] = [];
  for (const handle of handles) {
    const product = await getProductByHandle(handle, { cache: 'no-store' });
    if (!product) continue;
    const row = mapProductForBrandVideo(product);
    const img = await fetchPrimaryImage(product);
    if (img) {
      row.imageBuffer = img.buffer;
      row.imageAspect = img.aspect;
    }
    out.push(row);
  }
  return out;
}

export function padProductsToThree(products: BrandVideoProductRow[]): BrandVideoProductRow[] {
  if (products.length === 0) return [];
  if (products.length >= 3) return products.slice(0, 3);
  if (products.length === 1) return [products[0], products[0], products[0]];
  return [products[0], products[1], products[1]];
}
