/**
 * Public supplier storefront catalogue (`/products.json`) for Collective price resyncs.
 * Read-only; no auth.
 */

export type SupplierVariant = {
  variantId: string;
  handle: string;
  productTitle: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
};

type ProductsJson = {
  products: Array<{
    handle: string;
    title: string;
    variants: Array<{ id: number; title: string; sku: string | null; price: string; compare_at_price: string | null }>;
  }>;
};

export async function fetchSupplierCatalog(baseUrl: string): Promise<SupplierVariant[]> {
  const out: SupplierVariant[] = [];
  for (let page = 1; page <= 40; page++) {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/products.json?limit=250&page=${page}`);
    if (!res.ok) throw new Error(`Supplier products.json page ${page}: HTTP ${res.status}`);
    const json = (await res.json()) as ProductsJson;
    if (!json.products?.length) break;
    for (const p of json.products) {
      for (const v of p.variants) {
        const compare = v.compare_at_price ? Number(v.compare_at_price) : null;
        out.push({
          variantId: String(v.id),
          handle: p.handle,
          productTitle: p.title,
          title: v.title,
          sku: (v.sku ?? '').trim(),
          price: Number(v.price),
          compareAtPrice: compare != null && !Number.isNaN(compare) ? compare : null,
        });
      }
    }
  }
  return out;
}

export type SupplierIndex = {
  bySku: Map<string, SupplierVariant>;
  byVariantId: Map<string, SupplierVariant>;
  byHandleTitle: Map<string, SupplierVariant>;
};

const norm = (s: string) => s.trim().toLowerCase();

export function indexSupplierCatalog(variants: SupplierVariant[]): SupplierIndex {
  const bySku = new Map<string, SupplierVariant>();
  const dupSkus = new Set<string>();
  const byVariantId = new Map<string, SupplierVariant>();
  const byHandleTitle = new Map<string, SupplierVariant>();
  for (const v of variants) {
    if (v.sku) {
      const k = norm(v.sku);
      if (bySku.has(k)) dupSkus.add(k);
      bySku.set(k, v);
    }
    byVariantId.set(v.variantId, v);
    byHandleTitle.set(`${norm(v.handle)}::${norm(v.title)}`, v);
  }
  for (const k of dupSkus) bySku.delete(k);
  return { bySku, byVariantId, byHandleTitle };
}

/**
 * Collective-imported variants without a supplier SKU get `sku-<supplierVariantId>`.
 * Match order: SKU, synthetic variant-id SKU, handle + variant title.
 */
export function matchSupplierVariant(
  index: SupplierIndex,
  ours: { sku: string | null; handle: string; title: string }
): { match: SupplierVariant; via: 'sku' | 'variant_id' | 'handle_title' } | null {
  const sku = (ours.sku ?? '').trim();
  const synthetic = /^sku-(\d+)$/i.exec(sku);
  if (synthetic) {
    const hit = index.byVariantId.get(synthetic[1]);
    if (hit) return { match: hit, via: 'variant_id' };
  } else if (sku) {
    const hit = index.bySku.get(norm(sku));
    if (hit) return { match: hit, via: 'sku' };
  }
  const hit = index.byHandleTitle.get(`${norm(ours.handle)}::${norm(ours.title)}`);
  return hit ? { match: hit, via: 'handle_title' } : null;
}
