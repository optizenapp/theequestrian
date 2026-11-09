import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { RewardsOrderLine, RewardsOrderSnapshot } from '../lib/rewards/order-source';
import { buildOrderCalculation, deriveOrderRewardState } from '../lib/rewards/order-state';
import { planRewardMovements, type BucketTotals, type PlannedMovement } from '../lib/rewards/plan-movements';

const orderLine = (lineId: string, netCents: number, overrides: Partial<RewardsOrderLine> = {}): RewardsOrderLine => ({
  lineId,
  quantity: 1,
  currentQuantity: 1,
  unfulfilledQuantity: 1,
  isGiftCard: false,
  netCents,
  ...overrides,
});

const order = (lines: RewardsOrderLine[], overrides: Partial<RewardsOrderSnapshot> = {}): RewardsOrderSnapshot => ({
  orderId: 'gid://shopify/Order/1',
  name: '#1001',
  createdAt: new Date('2026-12-01T00:00:00Z'),
  cancelled: false,
  test: false,
  currency: 'AUD',
  financialStatus: 'PAID',
  customerId: 'gid://shopify/Customer/9',
  lines,
  ...overrides,
});

function applyMovements(totals: BucketTotals, movements: PlannedMovement[]): BucketTotals {
  return movements.reduce(
    (acc, m) => ({ ...acc, [m.bucket]: acc[m.bucket] + m.amountCents, hasMovements: true }),
    totals
  );
}

const empty: BucketTotals = { pending: 0, available: 0, hasMovements: false };

test('two-supplier order stays pending through the first shipment, releases $5 after the second', () => {
  const unshipped = order([orderLine('a', 10000), orderLine('b', 15000)]);
  const calc = buildOrderCalculation(unshipped, 200);

  const paid = deriveOrderRewardState(unshipped, calc, false);
  assert.deepEqual(paid, { status: 'pending', awardCents: 500 });
  let totals = applyMovements(empty, planRewardMovements('1', empty, paid));
  assert.deepEqual(totals, { pending: 500, available: 0, hasMovements: true });

  const firstShipped = order([orderLine('a', 10000, { unfulfilledQuantity: 0 }), orderLine('b', 15000)]);
  const partial = deriveOrderRewardState(firstShipped, calc, false);
  assert.equal(partial.status, 'pending');
  assert.equal(planRewardMovements('1', totals, partial).length, 0);

  const allShipped = order([
    orderLine('a', 10000, { unfulfilledQuantity: 0 }),
    orderLine('b', 15000, { unfulfilledQuantity: 0 }),
  ]);
  const released = deriveOrderRewardState(allShipped, calc, false);
  totals = applyMovements(totals, planRewardMovements('1', totals, released));
  assert.deepEqual(totals, { pending: 0, available: 500, hasMovements: true });
});

test('replaying the same state plans no new movements', () => {
  const state = { status: 'released' as const, awardCents: 500 };
  const first = planRewardMovements('1', empty, state);
  const totals = applyMovements(empty, first);
  assert.equal(planRewardMovements('1', totals, state).length, 0);
});

test('cancelling unshipped items recalculates on retained items and releases', () => {
  const original = order([orderLine('a', 10000), orderLine('b', 15000)]);
  const calc = buildOrderCalculation(original, 200);
  const edited = order([
    orderLine('a', 10000, { unfulfilledQuantity: 0 }),
    orderLine('b', 15000, { currentQuantity: 0, unfulfilledQuantity: 0 }),
  ]);
  assert.deepEqual(deriveOrderRewardState(edited, calc, false), { status: 'released', awardCents: 200 });
});

test('return after release reverses only the difference from the available bucket', () => {
  const lines = [orderLine('pair', 10000, { quantity: 2, currentQuantity: 2, unfulfilledQuantity: 0 })];
  const calc = buildOrderCalculation(order(lines), 200);
  const released = { pending: 0, available: 200, hasMovements: true };
  const afterReturn = order([{ ...lines[0], currentQuantity: 1 }]);
  const state = deriveOrderRewardState(afterReturn, calc, true);
  assert.deepEqual(state, { status: 'released', awardCents: 100 });
  const movements = planRewardMovements('1', released, state);
  assert.deepEqual(movements.map((m) => [m.bucket, m.amountCents]), [['available', -100]]);
});

test('cancelled, unpaid and fully refunded orders earn zero; gift cards never block release', () => {
  const lines = [orderLine('a', 25000), orderLine('gift', 5000, { isGiftCard: true })];
  const calc = buildOrderCalculation(order(lines), 200);
  assert.equal(calc.awardCents, 500);
  assert.deepEqual(deriveOrderRewardState(order(lines, { cancelled: true }), calc, false), { status: 'void', awardCents: 0 });
  assert.deepEqual(deriveOrderRewardState(order(lines, { financialStatus: 'PENDING' }), calc, false), { status: 'void', awardCents: 0 });
  const refunded = order(lines.map((l) => ({ ...l, currentQuantity: 0 })), { financialStatus: 'REFUNDED' });
  assert.deepEqual(deriveOrderRewardState(refunded, calc, false), { status: 'void', awardCents: 0 });
  const shipped = order([{ ...lines[0], unfulfilledQuantity: 0 }, lines[1]]);
  assert.equal(deriveOrderRewardState(shipped, calc, false).status, 'released');
});
