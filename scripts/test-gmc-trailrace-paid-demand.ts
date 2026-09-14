/**
 * Trailrace paid-demand matching + custom_label_3 wiring.
 * Run: npx tsx scripts/test-gmc-trailrace-paid-demand.ts
 */
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildGmcCustomLabels } from '../lib/gmc/custom-labels';
import {
  buildEquestrianTitleCandidates,
  loadTrailraceDemandIndex,
  normalizeDemandTitle,
  parseTrailraceAdsItemId,
  resolveTrailracePaidDemand,
} from '../lib/gmc/trailrace-paid-demand';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-demand-'));
const seedPath = path.join(tmp, 'seed.csv');
const mapPath = path.join(tmp, 'map.csv');

fs.writeFileSync(
  seedPath,
  [
    'trailrace_item_id,trailrace_title,trailrace_price_aud,trailrace_clicks,trailrace_impressions,trailrace_cost_aud,trailrace_conversion_value_aud,trailrace_roas,trailrace_paid_label',
    'shopify_au_111_1001,Exact GTIN Jacket Blue / M,100,5,10,10,300,30,tr_a',
    'shopify_au_222_2002,Shared Sku Boots Black / 42,200,3,10,20,150,7.5,tr_b',
    'shopify_au_333_3003,Title Only Helmet Navy / Medium,500,4,10,5,80,16,tr_c',
    'shopify_au_444_4004,Ambiguous Twin Red / S,50,2,10,5,120,24,tr_b',
    'shopify_au_555_5005,Ambiguous Twin Red / S,50,2,10,5,400,80,tr_a',
  ].join('\n')
);

fs.writeFileSync(
  mapPath,
  [
    'vendor_connection_id,vendor_shopify_product_id,vendor_shopify_variant_id,vendor_inventory_item_id,vendor_location_id,marketplace_product_id,marketplace_variant_id,marketplace_inventory_item_id,marketplace_location_id,sku,status',
    '1,111,1001,,,9001,91001,,,SKU-A,active',
    '1,222,2002,,,9002,91002,,,SKU-B,active',
    '1,999,9999,,,9003,91003,,,SKU-NONE,active',
  ].join('\n')
);

const index = loadTrailraceDemandIndex({ seedPath, mapPath });
assert.equal(index.seedRows.length, 5);

assert.deepEqual(parseTrailraceAdsItemId('shopify_au_111_1001'), {
  productId: '111',
  variantId: '1001',
});

// Exact variant map → tr_a
{
  const match = resolveTrailracePaidDemand(index, {
    marketplaceVariantId: '91001',
    sku: 'OTHER',
    productTitle: 'Ignored',
  });
  assert.equal(match.label, 'tr_a');
  assert.equal(match.method, 'variant_map');
}

// SKU match when not on variant map as converter
{
  // 91002 is on map with SKU-B — variant_map wins first; use a different TE id with same SKU
  const match = resolveTrailracePaidDemand(index, {
    marketplaceVariantId: '999999',
    sku: 'SKU-B',
    productTitle: 'Anything',
  });
  assert.equal(match.label, 'tr_b');
  assert.equal(match.method, 'sku');
}

// Title-only high-confidence match
{
  const match = resolveTrailracePaidDemand(index, {
    marketplaceVariantId: '888888',
    sku: null,
    productTitle: 'Title Only Helmet',
    selectedOptions: [
      { name: 'Color', value: 'Navy' },
      { name: 'Size', value: 'Medium' },
    ],
  });
  assert.equal(match.label, 'tr_c');
  assert.equal(match.method, 'normalized_title');
}

// Ambiguous title → tr_unmatched
{
  const match = resolveTrailracePaidDemand(index, {
    marketplaceVariantId: '777777',
    productTitle: 'Ambiguous Twin Red / S',
  });
  assert.equal(match.label, 'tr_unmatched');
  assert.equal(match.confidence, 'ambiguous');
}

// Mapped Trailrace TE variant with no conversion evidence → tr_none
{
  const match = resolveTrailracePaidDemand(index, {
    marketplaceVariantId: '91003',
    productTitle: 'Unknown Trailrace Product',
  });
  assert.equal(match.label, 'tr_none');
  assert.equal(match.method, 'trailrace_presence');
}

// Trailrace vendor without converter evidence → tr_none
{
  const match = resolveTrailracePaidDemand(index, {
    marketplaceVariantId: '1',
    vendor: 'Trailrace',
    productTitle: 'Some Trailrace Rug',
  });
  assert.equal(match.label, 'tr_none');
}

// Unmatched
{
  const match = resolveTrailracePaidDemand(index, {
    marketplaceVariantId: '1',
    productTitle: 'Completely Unknown Widget',
  });
  assert.equal(match.label, 'tr_unmatched');
  assert.equal(match.method, 'none');
}

// Trailrace label does not alter custom_label_2 / vendor
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 100,
    tags: [],
    vendor: 'Trailrace',
    unitCostAud: 60,
    availableForSale: true,
    quantityAvailable: 1,
    trailracePaidLabel: 'tr_a',
  });
  assert.equal(labels.custom_label_2, 'prime');
  assert.equal(labels.custom_label_3, 'tr_a');
  assert.equal(labels.custom_label_4, 'trailrace');
}

// Sale price change does not alter Trailrace demand label
{
  const list = buildGmcCustomLabels({
    sellingPriceAud: 120,
    tags: [],
    vendor: 'Trailrace',
    unitCostAud: 70,
    availableForSale: true,
    trailracePaidLabel: 'tr_b',
  });
  const sale = buildGmcCustomLabels({
    sellingPriceAud: 60,
    tags: [],
    vendor: 'Trailrace',
    unitCostAud: 70,
    availableForSale: true,
    trailracePaidLabel: 'tr_b',
  });
  assert.equal(list.custom_label_3, 'tr_b');
  assert.equal(sale.custom_label_3, 'tr_b');
  assert.notEqual(list.custom_label_2, sale.custom_label_2);
}

assert.ok(
  normalizeDemandTitle("Samshield Miss Shield 2.0 — Navy") ===
    normalizeDemandTitle('samshield miss shield 2.0 - navy')
);

const candidates = buildEquestrianTitleCandidates({
  productTitle: 'Equipe Stirrup Leathers',
  selectedOptions: [
    { name: 'Color', value: 'Brown' },
    { name: 'Size', value: '145cm' },
  ],
});
assert.ok(candidates.includes('Equipe Stirrup Leathers Brown / 145cm'));

const allowed = new Set(['tr_a', 'tr_b', 'tr_c', 'tr_none', 'tr_unmatched']);
for (const label of ['tr_a', 'tr_b', 'tr_c', 'tr_none', 'tr_unmatched'] as const) {
  assert.ok(allowed.has(label));
  assert.equal(
    buildGmcCustomLabels({
      sellingPriceAud: 50,
      tags: ['margin:40'],
      vendor: 'X',
      availableForSale: true,
      trailracePaidLabel: label,
    }).custom_label_3,
    label
  );
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('✅ All Trailrace paid-demand tests passed');
