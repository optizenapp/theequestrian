/**
 * Filter normalisation + matching checks (fixtures only, no network).
 * Run: npm run test:filter-normalization
 */

import assert from 'node:assert/strict';
import { colourExclusionReason, colourKey, colourLabel } from '@/lib/filters/colour-normalize';
import { sizeKey } from '@/lib/filters/size-normalize';
import { classifyOptionName } from '@/lib/filters/option-classify';
import { buildFacetValues, filterProductsByOptions, sameFacetValue } from '@/lib/filters/facet-values';
import type { ShopifyProduct } from '@/types/shopify';

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

type Opt = Record<string, string>;
function product(id: string, variants: Opt[]): ShopifyProduct {
  return {
    id,
    variants: {
      edges: variants.map((opts, i) => ({
        node: {
          id: `${id}-v${i}`,
          availableForSale: true,
          selectedOptions: Object.entries(opts).map(([name, value]) => ({ name, value })),
        },
      })),
    },
  } as unknown as ShopifyProduct;
}

check('option names classified explicitly', () => {
  assert.equal(classifyOptionName('Colour'), 'colour');
  assert.equal(classifyOptionName(' COLOR '), 'colour');
  assert.equal(classifyOptionName('Size'), 'size');
  assert.equal(classifyOptionName('Pack Size'), 'pack');
  assert.equal(classifyOptionName('Size/Colour'), null);
  assert.equal(classifyOptionName('Style'), null);
  assert.equal(classifyOptionName('US Size'), null);
});

check('non-colours excluded from colour', () => {
  for (const v of ['3 Pack', '3Pack', '6 Pack', '70cm', '75cm', '12.5cm', '42', 'Default Title', '1-5 Characters', 'Neck 15mm']) {
    assert.notEqual(colourExclusionReason(v), null, v);
    assert.equal(colourKey(v), null, v);
  }
});

check('real colours kept, not over-simplified', () => {
  assert.equal(colourKey('Black/White'), 'black white');
  assert.equal(colourKey('Light Blue'), 'light blue');
  assert.equal(colourKey('Rose Gold'), 'rose gold');
  assert.equal(colourKey('Blue-155mm'), 'blue 155mm');
  assert.equal(colourKey('Off-White'), 'off white');
});

check('verified supplier codes stripped for display only', () => {
  assert.equal(colourLabel('2C00-Pale Mauve'), 'Pale Mauve');
  assert.equal(colourLabel('8BGO- Anthracite/Gold'), 'Anthracite/Gold');
  assert.equal(colourLabel('01-White'), 'White');
  assert.equal(colourLabel('R810-Light Grey Stripe'), 'Light Grey Stripe');
  assert.equal(colourLabel('Dark-Green'), 'Dark-Green');
  assert.equal(colourKey('7E99- Somkey Blue/Black'), colourKey('7E99-Somkey Blue/Black'));
});

check('sizes merged only when equivalent', () => {
  assert.equal(sizeKey('0-1 years'), sizeKey('0-1 Years'));
  assert.equal(sizeKey('0 - 1 yrs'), '0-1 years');
  assert.equal(sizeKey('COB'), sizeKey('Cob'));
  assert.equal(sizeKey('250ML'), sizeKey('250ml'));
  assert.notEqual(sizeKey('0'), sizeKey('00'));
  assert.notEqual(sizeKey('00'), sizeKey('000'));
  assert.notEqual(sizeKey('US 8'), sizeKey('UK 8'));
  assert.equal(sizeKey('Black'), null);
});

const catalogue = [
  product('p1', [{ Colour: 'Red', Size: 'S' }, { Colour: 'Blue', Size: 'L' }]),
  product('p2', [{ Color: 'Red', Size: 'L' }, { Color: 'Red', Size: 'M' }]),
  product('p3', [{ Colour: '3 Pack', Size: 'L' }]),
  product('p4', [{ 'Size/Colour': 'Red / L' }]),
  product('p5', [{ Colour: '2C00-Pale Mauve', Size: '0-1 years' }, { Colour: 'Pale Mauve', Size: '0-1 Years' }]),
];

check('combined colour + size must exist on one variant', () => {
  const ids = filterProductsByOptions(catalogue, { colors: ['Red'], sizes: ['L'] }).map((p) => p.id);
  assert.deepEqual(ids, ['p2']);
});

check('colour facet: no pack values, distinct product counts, merged labels', () => {
  const colours = buildFacetValues(catalogue, 'colour');
  assert.deepEqual(colours.map((c) => c.label), ['Blue', 'Pale Mauve', 'Red']);
  assert.equal(colours.find((c) => c.label === 'Red')?.count, 2);
  assert.equal(colours.find((c) => c.label === 'Pale Mauve')?.count, 1);
});

check('size facet merges case variants with product counts', () => {
  const sizes = buildFacetValues(catalogue, 'size');
  const age = sizes.filter((s) => s.label.toLowerCase() === '0-1 years');
  assert.equal(age.length, 1);
  assert.equal(age[0].count, 1);
  assert.equal(sizes.find((s) => s.label === 'L')?.count, 3);
});

check('legacy URL values still match', () => {
  assert.deepEqual(filterProductsByOptions(catalogue, { colors: ['2c00-pale mauve'] }).map((p) => p.id), ['p5']);
  assert.deepEqual(filterProductsByOptions(catalogue, { colors: ['pale mauve'] }).map((p) => p.id), ['p5']);
  assert.ok(sameFacetValue('size', 'LARGE', 'large'));
});

check('unrecognised filter never broadens to all products', () => {
  assert.deepEqual(filterProductsByOptions(catalogue, { colors: ['3 pack'] }), []);
  assert.deepEqual(filterProductsByOptions(catalogue, { colors: ['Chartreuse'] }), []);
  assert.deepEqual(filterProductsByOptions(catalogue, { sizes: [','] }), []);
});

console.log(`\n${passed} checks passed`);
