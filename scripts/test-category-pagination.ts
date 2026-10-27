/**
 * Category PLP pagination checks (no network, no DB).
 * Run: npm run test:category-pagination
 */

import assert from 'node:assert/strict';
import { paginateById, offsetPathPagination } from '@/lib/pagination/category-cursor';
import { parseCursorParam, isDefaultCategoryView, pathWithoutCursor } from '@/lib/pagination/category-query';
import { buildCategoryCanonicalUrl, selfCanonicalCursor } from '@/lib/seo/category-canonical';
import { compareCategoryProducts } from '@/lib/products/category-sort';
import type { ShopifyProduct } from '@/types/shopify';

const gid = (n: number) => `gid://shopify/Product/${1000 + n}`;
const items = Array.from({ length: 100 }, (_, i) => ({ id: gid(i) }));
const N = 36;
let passed = 0;

function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✓ ${name}`);
}

check('page 1: no cursor', () => {
  const r = paginateById(items, null, N);
  assert.equal(r.products.length, 36);
  assert.equal(r.pagination.cursorStatus, 'none');
  assert.equal(r.pagination.isFirstPage, true);
  assert.equal(r.pageInfo.endCursor, gid(35));
});

check('page 2: previous is clean URL', () => {
  const r = paginateById(items, gid(35), N);
  assert.equal(r.products[0].id, gid(36));
  assert.equal(r.pagination.cursorStatus, 'valid');
  assert.equal(r.pagination.previousCursor, null);
  assert.equal(r.pageInfo.endCursor, gid(71));
});

check('page 3: previous returns page 2', () => {
  const r = paginateById(items, gid(71), N);
  assert.equal(r.pagination.startIndex, 72);
  assert.equal(r.pagination.previousCursor, gid(35));
  assert.equal(r.pageInfo.hasNextPage, false);
  assert.equal(r.pageInfo.endCursor, null);
});

check('off-boundary cursor: previous = item before max(0, s - n)', () => {
  const r = paginateById(items, gid(49), N);
  assert.equal(r.pagination.startIndex, 50);
  assert.equal(r.pagination.previousCursor, gid(13));
});

check('unknown cursor → invalid, empty', () => {
  const r = paginateById(items, gid(9999), N);
  assert.equal(r.pagination.cursorStatus, 'invalid');
  assert.equal(r.products.length, 0);
});

check('cursor at final product → invalid', () => {
  assert.equal(paginateById(items, gid(99), N).pagination.cursorStatus, 'invalid');
});

check('offset path pagination', () => {
  assert.equal(offsetPathPagination(null, true).cursorStatus, 'none');
  assert.equal(offsetPathPagination('db:36', false).cursorStatus, 'invalid');
  assert.equal(offsetPathPagination('db:36', true).cursorStatus, 'valid');
});

check('cursor param parsing', () => {
  assert.equal(parseCursorParam(undefined).kind, 'none');
  assert.equal(parseCursorParam('').kind, 'empty');
  assert.equal(parseCursorParam([gid(1), gid(2)]).kind, 'malformed');
  assert.equal(parseCursorParam('garbage').kind, 'malformed');
  assert.equal(parseCursorParam(gid(1)).kind, 'value');
  assert.equal(parseCursorParam('db:72').kind, 'value');
});

check('default view detection', () => {
  assert.equal(isDefaultCategoryView({ cursor: gid(1), utm_source: 'x' }), true);
  assert.equal(isDefaultCategoryView({ sort: 'featured' }), true);
  assert.equal(isDefaultCategoryView({ sort: 'price-asc' }), false);
  assert.equal(isDefaultCategoryView({ brand: 'kentucky' }), false);
});

check('path without cursor keeps other params', () => {
  assert.equal(pathWithoutCursor('/clothing', { cursor: '', sort: 'newest' }), '/clothing?sort=newest');
  assert.equal(pathWithoutCursor('/clothing', { cursor: '' }), '/clothing');
});

check('canonical: self only for valid default view, tracking stripped', () => {
  const valid = paginateById(items, gid(35), N).pagination;
  const invalid = paginateById(items, gid(9999), N).pagination;
  const base = buildCategoryCanonicalUrl('/clothing', null);
  assert.ok(base.endsWith('/clothing'));
  assert.equal(selfCanonicalCursor({ cursor: gid(35), gclid: 'z' }, gid(35), valid), gid(35));
  assert.equal(selfCanonicalCursor({ cursor: gid(35), sort: 'newest' }, gid(35), valid), null);
  assert.equal(selfCanonicalCursor({ cursor: gid(9999) }, gid(9999), invalid), null);
  assert.equal(
    buildCategoryCanonicalUrl('/clothing', gid(35)),
    `${base}?cursor=gid%3A%2F%2Fshopify%2FProduct%2F1035`
  );
});

check('featured sort: in-stock, newest, then id', () => {
  const p = (id: string, createdAt: string, available: boolean) =>
    ({
      id,
      createdAt,
      priceRange: { minVariantPrice: { amount: '10', currencyCode: 'AUD' } },
      variants: { edges: [{ node: { availableForSale: available } }] },
    }) as unknown as ShopifyProduct;
  const list = [
    p('b', '2026-01-01', true),
    p('a', '2026-01-01', true),
    p('c', '2026-06-01', true),
    p('d', '2026-09-01', false),
  ];
  const order = [...list].sort((x, y) => compareCategoryProducts(x, y, 'featured')).map((x) => x.id);
  assert.deepEqual(order, ['c', 'a', 'b', 'd']);
});

console.log(`\n${passed} checks passed`);
