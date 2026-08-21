/**
 * Boundary + sanity tests for GMC custom-label economics.
 * Run: npx tsx scripts/test-gmc-custom-labels.ts
 */
import assert from 'node:assert/strict';
import {
  buildGmcCustomLabels,
  getGrossContribution,
  getMarginRangeLabel,
  getPriceTier,
  getProfitabilityLabel,
  parseExactMarginPercentFromTags,
} from '../lib/gmc/custom-labels';

function expectTier(price: number, marginPct: number, expected: string) {
  const contribution = getGrossContribution(price, marginPct);
  const tier = getProfitabilityLabel(contribution);
  assert.equal(
    tier,
    expected,
    `A$${price} @ ${marginPct}% → contribution ${contribution} expected ${expected}, got ${tier}`
  );
}

// Price tier boundaries
assert.equal(getPriceTier(49.99), 'under_50');
assert.equal(getPriceTier(50), '50_to_100');
assert.equal(getPriceTier(99.99), '50_to_100');
assert.equal(getPriceTier(100), '100_to_150');
assert.equal(getPriceTier(149.99), '100_to_150');
assert.equal(getPriceTier(150), '150_to_300');
assert.equal(getPriceTier(299.99), '150_to_300');
assert.equal(getPriceTier(300), '300_plus');

// Margin range boundaries
assert.equal(getMarginRangeLabel(9.99), 'margin_under_10');
assert.equal(getMarginRangeLabel(10), 'margin_10_19');
assert.equal(getMarginRangeLabel(19.99), 'margin_10_19');
assert.equal(getMarginRangeLabel(20), 'margin_20_29');
assert.equal(getMarginRangeLabel(29.99), 'margin_20_29');
assert.equal(getMarginRangeLabel(30), 'margin_30_39');
assert.equal(getMarginRangeLabel(39.99), 'margin_30_39');
assert.equal(getMarginRangeLabel(40), 'margin_40_plus');
assert.equal(getMarginRangeLabel(null), 'unknown');

// Contribution thresholds
assert.equal(getProfitabilityLabel(5.99), 'do_not_advertise');
assert.equal(getProfitabilityLabel(6), 'tier_3');
assert.equal(getProfitabilityLabel(9.99), 'tier_3');
assert.equal(getProfitabilityLabel(10), 'tier_2');
assert.equal(getProfitabilityLabel(19.99), 'tier_2');
assert.equal(getProfitabilityLabel(20), 'tier_1');
assert.equal(getProfitabilityLabel(null), 'do_not_advertise');

// Sanity matrix from brief
expectTier(50, 10, 'do_not_advertise');
expectTier(80, 10, 'tier_3');
expectTier(120, 10, 'tier_2');
expectTier(200, 10, 'tier_1');
expectTier(50, 17, 'tier_3');
expectTier(80, 17, 'tier_2');
expectTier(120, 17, 'tier_1');
expectTier(30, 25, 'tier_3');
expectTier(50, 25, 'tier_2');
expectTier(80, 25, 'tier_1');
expectTier(20, 40, 'tier_3');
expectTier(30, 40, 'tier_2');
expectTier(50, 40, 'tier_1');

// Exact margin drives profitability (not the range label)
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 120,
    tags: ['margin:17'],
    availableForSale: true,
    quantityAvailable: 12,
  });
  assert.equal(labels.custom_label_0, '100_to_150');
  assert.equal(labels.custom_label_1, 'margin_10_19');
  assert.equal(labels.custom_label_2, 'tier_1');
  assert.equal(labels.marginPercent, 17);
  assert.ok(labels.grossContributionAud != null);
  assert.ok(Math.abs(labels.grossContributionAud - 20.4) < 0.0001);
}

// Unknown margin fails closed
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 200,
    tags: ['margin:high'],
    availableForSale: true,
    quantityAvailable: 20,
  });
  assert.equal(labels.custom_label_1, 'unknown');
  assert.equal(labels.custom_label_2, 'do_not_advertise');
  assert.equal(labels.marginSource, 'unknown');
}

// unitCost → exact margin (not range midpoint)
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 100,
    tags: [],
    unitCostAud: 83, // 17%
    availableForSale: true,
    quantityAvailable: 5,
  });
  assert.equal(labels.marginSource, 'unit_cost');
  assert.ok(labels.marginPercent != null);
  assert.ok(Math.abs(labels.marginPercent - 17) < 0.0001);
  assert.equal(labels.custom_label_1, 'margin_10_19');
  assert.equal(labels.custom_label_2, 'tier_2'); // $17 contribution
}

// 10% Collective-style cost must not fall into margin_under_10 via float noise
{
  const price = 384.95;
  const cost = Number((price * 0.9).toFixed(2));
  const labels = buildGmcCustomLabels({
    sellingPriceAud: price,
    tags: [],
    unitCostAud: cost,
    availableForSale: true,
    quantityAvailable: 1,
  });
  assert.equal(labels.custom_label_1, 'margin_10_19');
  assert.equal(labels.marginPercent, 10);
}

// Tag wins over unit cost
assert.equal(parseExactMarginPercentFromTags(['margin:22%']), 22);
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 100,
    tags: ['margin:40'],
    unitCostAud: 90,
    availableForSale: true,
    quantityAvailable: 5,
  });
  assert.equal(labels.marginSource, 'tag');
  assert.equal(labels.marginPercent, 40);
  assert.equal(labels.custom_label_2, 'tier_1');
}

// Stock: qty threshold + supplier-managed
{
  assert.equal(
    buildGmcCustomLabels({
      sellingPriceAud: 50,
      tags: ['margin:40'],
      availableForSale: true,
      quantityAvailable: 4,
      tracked: true,
    }).custom_label_3,
    'low_stock'
  );
  assert.equal(
    buildGmcCustomLabels({
      sellingPriceAud: 50,
      tags: ['margin:40'],
      availableForSale: true,
      quantityAvailable: 5,
      tracked: true,
    }).custom_label_3,
    'high_stock'
  );
  assert.equal(
    buildGmcCustomLabels({
      sellingPriceAud: 50,
      tags: ['margin:40'],
      availableForSale: true,
      quantityAvailable: 0,
      tracked: false,
    }).custom_label_3,
    'high_stock'
  );
  assert.equal(
    buildGmcCustomLabels({
      sellingPriceAud: 50,
      tags: ['margin:40'],
      availableForSale: false,
      quantityAvailable: 100,
    }).custom_label_3,
    'low_stock'
  );
}

console.log('✅ All GMC custom-label tests passed');
