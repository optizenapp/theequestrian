const DECIMAL_AMOUNT = /^(\d+)(?:\.(\d{1,2}))?$/;

/** Parses a Shopify decimal money string (e.g. "250.00") into integer cents without float maths. */
export function toCents(amount: string): number {
  const trimmed = amount.trim();
  const match = DECIMAL_AMOUNT.exec(trimmed);
  if (!match) {
    throw new RangeError(`Invalid money amount: "${amount}"`);
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const cents = whole * 100 + fraction;
  assertCents(cents, 'amount');
  return cents;
}

/** Integer cents to the decimal string Shopify money inputs expect, e.g. 1234 -> "12.34". */
export function centsToAmount(cents: number): string {
  assertCents(cents, 'cents');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

export function formatAud(cents: number): string {
  assertCents(cents, 'cents');
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

export function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of cents, got ${value}`);
  }
}

/** Basis-point percentage of a cent amount, rounded to the nearest cent, half up. */
export function percentOfCentsHalfUp(cents: number, rateBps: number): number {
  assertCents(cents, 'cents');
  assertCents(rateBps, 'rateBps');
  return Math.floor((cents * rateBps + 5000) / 10000);
}

/**
 * Splits `total` cents across `weights` in proportion, using the largest-remainder method.
 * Ties go to the earliest index so the split is deterministic.
 */
export function allocateCents(total: number, weights: number[]): number[] {
  assertCents(total, 'total');
  weights.forEach((weight, index) => assertCents(weight, `weights[${index}]`));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weights.length === 0 || total === 0) return weights.map(() => 0);
  if (weightSum === 0) {
    throw new RangeError('Cannot allocate a non-zero total across zero weights');
  }

  const shares = weights.map((weight, index) => {
    const exact = total * weight;
    return { index, base: Math.floor(exact / weightSum), remainder: exact % weightSum };
  });
  let leftover = total - shares.reduce((sum, share) => sum + share.base, 0);
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const share of byRemainder) {
    if (leftover === 0) break;
    share.base += 1;
    leftover -= 1;
  }
  return shares.map((share) => share.base);
}
