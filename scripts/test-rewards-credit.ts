import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planCreditPosting } from '../lib/rewards/credit-plan';
import { centsToAmount } from '../lib/rewards/money';

test('owed rewards are credited in full', () => {
  assert.deepEqual(planCreditPosting(1500, 1000), { kind: 'credit', amountCents: 500 });
  assert.deepEqual(planCreditPosting(80, 0), { kind: 'credit', amountCents: 80 });
});

test('in sync writes nothing', () => {
  assert.deepEqual(planCreditPosting(1000, 1000), { kind: 'none', reason: 'in-sync' });
});

test('without a fresh reversal, a gap is never debited (and the balance is never read)', () => {
  assert.deepEqual(planCreditPosting(600, 1000), { kind: 'none', reason: 'shortfall' });
  assert.deepEqual(planCreditPosting(600, 1000, 0, 5000), { kind: 'none', reason: 'shortfall' });
});

test('a fresh reversal asks for the live balance before debiting', () => {
  assert.deepEqual(planCreditPosting(600, 1000, 400), { kind: 'needs-balance' });
});

test('a fresh reversal debits only what the customer still holds', () => {
  assert.deepEqual(planCreditPosting(600, 1000, 400, 1000), { kind: 'debit', amountCents: 400 });
  assert.deepEqual(planCreditPosting(600, 1000, 400, 250), { kind: 'debit', amountCents: 250 });
});

test('a fresh reversal never takes an older shortfall from other store credit', () => {
  // Old unrecovered gap of $6, new $1 reversal, $50 refund credit in the balance: only $1 is debited.
  assert.deepEqual(planCreditPosting(300, 1000, 100, 5000), { kind: 'debit', amountCents: 100 });
});

test('a spent reversal leaves a shortfall and never goes negative', () => {
  assert.deepEqual(planCreditPosting(0, 1000, 1000, 0), { kind: 'none', reason: 'shortfall' });
});

test('future earnings fill a shortfall before any new credit', () => {
  // Earned $10 (credited), spent it, then returned: target 0, posted 10 -> shortfall $10.
  // Next order earns $4: target 4 vs posted 10 -> still short $6, nothing credited.
  assert.deepEqual(planCreditPosting(400, 1000), { kind: 'none', reason: 'shortfall' });
  // A later order earns $8: target 12 vs posted 10 -> $2 credited.
  assert.deepEqual(planCreditPosting(1200, 1000), { kind: 'credit', amountCents: 200 });
});

test('cents convert to Shopify decimal strings exactly', () => {
  assert.equal(centsToAmount(1234), '12.34');
  assert.equal(centsToAmount(5), '0.05');
  assert.equal(centsToAmount(100), '1.00');
  assert.throws(() => centsToAmount(-1));
});
