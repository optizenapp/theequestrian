/**
 * Boundary + sanity tests for GMC paid-acquisition custom labels.
 * Run: npx tsx scripts/test-gmc-custom-labels.ts
 */
import assert from 'node:assert/strict';
import {
  buildGmcCustomLabels,
  getGrossContributionFromCost,
  getGrossContributionFromMargin,
  getMarginRangeLabel,
  getPaidAcquisitionLabel,
  getPriceTier,
  parseExactMarginPercentFromTags,
} from '../lib/gmc/custom-labels';

function expectPaid(price: number, marginPct: number, expected: string) {
  const contribution = getGrossContributionFromMargin(price, marginPct);
  const label = getPaidAcquisitionLabel(marginPct, contribution, price);
  assert.equal(
    label,
    expected,
    `A$${price} @ ${marginPct}% → contrib ${contribution} expected ${expected}, got ${label}`
  );
}

// Price tier boundaries (unchanged)
assert.equal(getPriceTier(49.99), 'under_50');
assert.equal(getPriceTier(50), '50_to_100');
assert.equal(getPriceTier(99.99), '50_to_100');
assert.equal(getPriceTier(100), '100_to_150');
assert.equal(getPriceTier(149.99), '100_to_150');
assert.equal(getPriceTier(150), '150_to_300');
assert.equal(getPriceTier(299.99), '150_to_300');
assert.equal(getPriceTier(300), '300_plus');

// Margin range boundaries (unchanged thresholds)
assert.equal(getMarginRangeLabel(9.99), 'margin_under_10');
assert.equal(getMarginRangeLabel(10), 'margin_10_19');
assert.equal(getMarginRangeLabel(19.99), 'margin_10_19');
assert.equal(getMarginRangeLabel(20), 'margin_20_29');
assert.equal(getMarginRangeLabel(29.99), 'margin_20_29');
assert.equal(getMarginRangeLabel(30), 'margin_30_39');
assert.equal(getMarginRangeLabel(39.99), 'margin_30_39');
assert.equal(getMarginRangeLabel(40), 'margin_40_plus');
assert.equal(getMarginRangeLabel(null), 'unknown');

// Margin boundaries for paid label (price passed so prime value gate applies)
assert.equal(getPaidAcquisitionLabel(19.99, 50, 100), 'do_not_advertise');
assert.equal(getPaidAcquisitionLabel(19.995, 50, 100), 'do_not_advertise');
assert.equal(getPaidAcquisitionLabel(20, 10, 100), 'test');
assert.equal(getPaidAcquisitionLabel(29.99, 20, 100), 'strong');
assert.equal(getPaidAcquisitionLabel(30, 20, 100), 'prime');
assert.equal(getPaidAcquisitionLabel(39.99, 20, 100), 'prime');
assert.equal(getPaidAcquisitionLabel(40, 20, 100), 'prime');

// Contribution boundaries at >=20% margin
assert.equal(getPaidAcquisitionLabel(25, 9.99, 100), 'do_not_advertise');
assert.equal(getPaidAcquisitionLabel(25, 10, 100), 'test');
assert.equal(getPaidAcquisitionLabel(25, 19.99, 100), 'test');
assert.equal(getPaidAcquisitionLabel(25, 20, 100), 'strong');
assert.equal(getPaidAcquisitionLabel(30, 20, 100), 'prime');

// Unknowns
assert.equal(getPaidAcquisitionLabel(null, 50, 100), 'do_not_advertise');
assert.equal(getPaidAcquisitionLabel(40, null, 100), 'do_not_advertise');
assert.equal(getPaidAcquisitionLabel(-5, 50, 100), 'do_not_advertise');

// Brief examples (prime = margin >= 30% AND contrib >= $20)
expectPaid(100, 40, 'prime'); // $40
expectPaid(80, 30, 'prime'); // $24
expectPaid(200, 30, 'prime'); // $60
expectPaid(100, 25, 'strong'); // $25
expectPaid(150, 20, 'strong'); // $30
expectPaid(50, 30, 'test'); // $15 — contrib < $20
expectPaid(30, 40, 'test'); // $12
expectPaid(70, 20, 'test'); // $14
expectPaid(300, 10, 'do_not_advertise');
expectPaid(200, 10, 'do_not_advertise');
expectPaid(45, 50, 'prime'); // $22.50 — under $50 still prime when contrib >= $20
expectPaid(45, 70, 'prime'); // $31.50
expectPaid(49.99, 40.1, 'prime'); // ~$20.05
expectPaid(50, 40, 'prime');

// Tag 17% with $20.40 contrib → DNA (margin < 20%)
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 120,
    tags: ['margin:17'],
    availableForSale: true,
    quantityAvailable: 12,
  });
  assert.equal(labels.custom_label_0, '100_to_150');
  assert.equal(labels.custom_label_1, 'margin_10_19');
  assert.equal(labels.custom_label_2, 'do_not_advertise');
  assert.equal(labels.marginPercent, 17);
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
}

// unitCost path: contribution = price − cost
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 100,
    tags: [],
    unitCostAud: 60, // 40%, $40
    availableForSale: true,
    quantityAvailable: 5,
  });
  assert.equal(labels.marginSource, 'unit_cost');
  assert.equal(labels.grossContributionAud, 40);
  assert.equal(labels.custom_label_2, 'prime');
  assert.ok(labels.marginPercent != null && Math.abs(labels.marginPercent - 40) < 1e-9);
}

// Cost >= price → DNA
{
  const labels = buildGmcCustomLabels({
    sellingPriceAud: 50,
    tags: [],
    unitCostAud: 55,
    availableForSale: true,
    quantityAvailable: 5,
  });
  assert.equal(labels.custom_label_2, 'do_not_advertise');
  assert.ok((labels.grossContributionAud ?? 0) < 0);
}

// Sale-price style: lower advertised price can drop prime → DNA
{
  const atList = buildGmcCustomLabels({
    sellingPriceAud: 100,
    tags: [],
    unitCostAud: 60,
    availableForSale: true,
    quantityAvailable: 5,
  });
  assert.equal(atList.custom_label_2, 'prime');

  const onSale = buildGmcCustomLabels({
    sellingPriceAud: 70, // same cost → margin ~14.3%, contrib $10
    tags: [],
    unitCostAud: 60,
    availableForSale: true,
    quantityAvailable: 5,
  });
  assert.equal(onSale.custom_label_2, 'do_not_advertise');
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
  assert.equal(labels.custom_label_2, 'prime');
  assert.equal(labels.grossContributionAud, 40);
}

// Stock unchanged
{
  assert.equal(
    buildGmcCustomLabels({
      sellingPriceAud: 100,
      tags: ['margin:40'],
      availableForSale: true,
      quantityAvailable: 4,
      tracked: true,
    }).custom_label_3,
    'low_stock'
  );
  assert.equal(
    buildGmcCustomLabels({
      sellingPriceAud: 100,
      tags: ['margin:40'],
      availableForSale: true,
      quantityAvailable: 5,
      tracked: true,
    }).custom_label_3,
    'high_stock'
  );
}

assert.equal(getGrossContributionFromCost(100, 75), 25);

console.log('✅ All GMC custom-label tests passed');
