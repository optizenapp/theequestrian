#!/usr/bin/env tsx
/**
 * Resync Collective variant prices to the supplier's own storefront retail price.
 * Dry-run by default (CSV only). --apply writes Shopify variant price + compare-at.
 * SKU / title matches that land on a different supplier handle are skipped, not guessed.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/resync-collective-supplier-prices.ts \
 *     --vendor="Little Equine Co." --supplier=https://www.littleequineco.com.au [--apply] [--allow-large]
 */
import * as fs from 'fs';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { updateMarketplaceVariantPriceRest } from '@/lib/shopify/marketplace-inventory-rest';
import { isMarketplaceVariantPriceLocked } from '@/lib/inventory/vendor-sync/repository';
import { getArg, hasFlag } from './lib/migration-cli';
import { fetchSupplierCatalog, indexSupplierCatalog, matchSupplierVariant } from './lib/supplier-catalog';

const LARGE_CHANGE_RATIO = 0.4;

type OurVariant = { id: string; title: string; sku: string | null; price: string; compareAtPrice: string | null };
type OurProduct = { handle: string; status: string; variants: { nodes: OurVariant[] } };
type ProductsPage = { products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: OurProduct[] } };

const QUERY = `query($q: String!, $after: String) {
  products(first: 100, after: $after, query: $q) {
    pageInfo { hasNextPage endCursor }
    nodes { handle status variants(first: 100) { nodes { id title sku price compareAtPrice } } }
  }
}`;

async function fetchOurProducts(vendor: string): Promise<OurProduct[]> {
  const out: OurProduct[] = [];
  let after: string | null = null;
  do {
    const data: ProductsPage = await shopifyAdminFetch<ProductsPage>({
      query: QUERY,
      variables: { q: `vendor:"${vendor.replace(/"/g, '\\"')}"`, after },
    });
    out.push(...data.products.nodes);
    after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (after);
  return out;
}

const money = (n: number | null) => (n == null ? '' : n.toFixed(2));
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const vendor = getArg('--vendor');
  const supplier = getArg('--supplier');
  if (!vendor || !supplier) throw new Error('--vendor and --supplier are required');
  const apply = hasFlag('--apply');
  const allowLarge = hasFlag('--allow-large');

  const [ours, catalog] = await Promise.all([fetchOurProducts(vendor), fetchSupplierCatalog(supplier)]);
  const index = indexSupplierCatalog(catalog);
  console.log(`Our products: ${ours.length}; supplier variants: ${catalog.length}; mode: ${apply ? 'APPLY' : 'dry-run'}`);

  const header = 'action,handle,status,variant_id,variant_title,sku,match_via,supplier_handle,current_price,current_compare_at,target_price,target_compare_at,price_diff';
  const rows: string[] = [header];
  const counts: Record<string, number> = {};
  const toApply: Array<{ id: string; price: string; compareAt: string | null }> = [];

  for (const p of ours) {
    for (const v of p.variants.nodes) {
      const id = v.id.split('/').pop() ?? v.id;
      const cur = Number(v.price);
      const curCmp = v.compareAtPrice ? Number(v.compareAtPrice) : null;
      const m = matchSupplierVariant(index, { sku: v.sku, handle: p.handle, title: v.title });
      let action = 'no_match';
      let target: number | null = null;
      let targetCmp: number | null = null;
      if (m) {
        target = m.match.price;
        targetCmp = m.match.compareAtPrice != null && m.match.compareAtPrice > target ? m.match.compareAtPrice : null;
        const same = cur === target && (curCmp ?? null) === targetCmp;
        if (same) action = 'unchanged';
        else if (m.via !== 'variant_id' && m.match.handle !== p.handle) action = 'skip_handle_mismatch';
        else if (await isMarketplaceVariantPriceLocked(id)) action = 'skip_locked';
        else if (!allowLarge && Math.abs(target - cur) / cur > LARGE_CHANGE_RATIO) action = 'skip_large';
        else action = 'update';
      }
      counts[action] = (counts[action] ?? 0) + 1;
      if (action === 'update' && target != null) toApply.push({ id, price: money(target), compareAt: targetCmp == null ? null : money(targetCmp) });
      rows.push([
        action, p.handle, p.status, id, v.title, v.sku ?? '', m?.via ?? '', m?.match.handle ?? '',
        money(cur), money(curCmp), money(target), money(targetCmp), target == null ? '' : (target - cur).toFixed(2),
      ].map((c) => csvCell(String(c))).join(','));
    }
  }

  const slug = vendor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const file = `exports/collective-price-resync-${slug}-${apply ? 'apply' : 'dry'}-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
  fs.writeFileSync(file, `${rows.join('\n')}\n`);
  console.log('Summary:', counts);
  console.log(`CSV: ${file}`);
  if (!apply) return;

  let ok = 0;
  let failed = 0;
  for (const u of toApply) {
    try {
      await updateMarketplaceVariantPriceRest({ variantIdNumeric: u.id, price: u.price, compareAtPrice: u.compareAt });
      ok += 1;
    } catch (e) {
      failed += 1;
      console.error(`Failed ${u.id}:`, e instanceof Error ? e.message : e);
    }
    await sleep(350);
  }
  console.log(`Applied ${ok}, failed ${failed}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
