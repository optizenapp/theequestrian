import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRewardReversal, offsetEarningAgainstShortfall } from '../lib/rewards/balance';
import { calculateRewards, DEFAULT_REWARD_RATE_BPS, maxRedeemableCents } from '../lib/rewards/calculate';
import { allocateCents, percentOfCentsHalfUp, toCents } from '../lib/rewards/money';
import { settleReturns } from '../lib/rewards/returns';
import type { RewardLineInput } from '../lib/rewards/types';

const rate = DEFAULT_REWARD_RATE_BPS;
const line = (lineId: string, netCents: number, quantity = 1, eligible = true): RewardLineInput => ({
  lineId,
  netCents,
  quantity,
  eligible,
});

test('first order, $250 eligible earns $5.00', () => {
  const result = calculateRewards({ lines: [line('a', 25000)], requestedRedemptionCents: 0, rateBps: rate });
  assert.equal(result.awardCents, 500);
});

test('$120 less $20 promo plus freight earns $2.00; gift card contributes zero', () => {
  const result = calculateRewards({
    lines: [line('saddle-pad', 10000), line('gift-card', 5000, 1, false)],
    requestedRedemptionCents: 0,
    rateBps: rate,
  });
  assert.equal(result.eligibleCents, 10000);
  assert.equal(result.awardCents, 200);
});

test('$100 eligible with $5 redeemed: $95 payable, $1.90 earned; full return unwinds once', () => {
  const result = calculateRewards({ lines: [line('a', 10000)], requestedRedemptionCents: 500, rateBps: rate });
  assert.equal(result.payableEligibleCents, 9500);
  assert.equal(result.awardCents, 190);

  const settlement = settleReturns(result, [{ lineId: 'a', quantity: 1 }]);
  assert.equal(settlement.finalAwardCents, 0);
  assert.equal(settlement.awardReversalCents, 190);
  assert.equal(settlement.redeemedRestoredCents, 500);
  assert.equal(settlement.cashRefundableCents, 9500);
});

test('$12 balance on $8 eligible applies $8, keeps $4, earns zero', () => {
  const redeem = maxRedeemableCents(1200, 800);
  const result = calculateRewards({ lines: [line('a', 800)], requestedRedemptionCents: 1200, rateBps: rate });
  assert.equal(redeem, 800);
  assert.equal(result.redeemedCents, 800);
  assert.equal(1200 - result.redeemedCents, 400);
  assert.equal(result.awardCents, 0);
});

for (const [label, lines, returned] of [
  ['one line of two', [line('pair', 10000, 2)], [{ lineId: 'pair', quantity: 1 }]],
  ['two lines', [line('x', 5000), line('y', 5000)], [{ lineId: 'y', quantity: 1 }]],
] as const) {
  test(`two $50 items, $5 redeemed, one returned (${label})`, () => {
    const result = calculateRewards({ lines: [...lines], requestedRedemptionCents: 500, rateBps: rate });
    const settlement = settleReturns(result, [...returned]);
    assert.equal(settlement.redeemedRestoredCents, 250);
    assert.equal(settlement.cashRefundableCents, 4750);
    assert.equal(settlement.finalAwardCents, 95);
  });
}

test('mixed-supplier checkout of $100 + $150 estimates $5.00 for the whole order', () => {
  const result = calculateRewards({
    lines: [line('supplier-a', 10000), line('supplier-b', 15000)],
    requestedRedemptionCents: 0,
    rateBps: rate,
  });
  assert.equal(result.awardCents, 500);
  assert.equal(result.lines.reduce((sum, l) => sum + l.awardCents, 0), 500);
});

test('2% rounds half up once per order, not per line', () => {
  assert.equal(percentOfCentsHalfUp(1225, rate), 25);
  assert.equal(percentOfCentsHalfUp(1224, rate), 24);
  const result = calculateRewards({
    lines: [line('a', 125), line('b', 125), line('c', 125)],
    requestedRedemptionCents: 0,
    rateBps: rate,
  });
  assert.equal(result.awardCents, 8);
});

test('allocation is deterministic and always sums to the total', () => {
  assert.deepEqual(allocateCents(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocateCents(0, [5, 5]), [0, 0]);
  assert.throws(() => allocateCents(1, [0, 0]));
});

test('money parsing rejects floats and junk', () => {
  assert.equal(toCents('250.00'), 25000);
  assert.equal(toCents('12.5'), 1250);
  assert.throws(() => toCents('-1.00'));
  assert.throws(() => toCents('1.005'));
});

test('reversal floors the balance at zero and offsets future earnings', () => {
  assert.deepEqual(applyRewardReversal(100, 190), { debitCents: 100, shortfallCents: 90 });
  assert.deepEqual(offsetEarningAgainstShortfall(500, 90), {
    creditCents: 410,
    offsetCents: 90,
    remainingShortfallCents: 0,
  });
});
