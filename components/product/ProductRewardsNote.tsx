'use client';

import { useEffect, useState } from 'react';
import { formatAud, percentOfCentsHalfUp, toCents } from '@/lib/rewards/money';

type Props = {
  /** Selected variant price as the Storefront string, e.g. "39.95". */
  priceAmount: string;
  currencyCode: string;
  isGiftCard: boolean;
};

type RateResponse = { enabled?: boolean; rateBps?: number };

let ratePromise: Promise<number> | null = null;

function loadRateBps(): Promise<number> {
  ratePromise ??= (async () => {
    const response = await fetch('/api/rewards/rate');
    if (!response.ok) throw new Error(`Rewards rate request failed (${response.status})`);
    const data = (await response.json()) as RateResponse;
    return data.enabled && typeof data.rateBps === 'number' ? data.rateBps : 0;
  })().catch((error: unknown) => {
    ratePromise = null;
    console.warn('[ProductRewardsNote] Rewards rate unavailable:', error);
    return 0;
  });
  return ratePromise;
}

export default function ProductRewardsNote({ priceAmount, currencyCode, isGiftCard }: Props) {
  const [rateBps, setRateBps] = useState(0);

  useEffect(() => {
    let active = true;
    loadRateBps().then((bps) => {
      if (active) setRateBps(bps);
    });
    return () => {
      active = false;
    };
  }, []);

  if (isGiftCard || currencyCode !== 'AUD' || rateBps <= 0) return null;
  let awardCents = 0;
  try {
    awardCents = percentOfCentsHalfUp(toCents(priceAmount), rateBps);
  } catch {
    return null;
  }
  if (awardCents <= 0) return null;

  return (
    <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900" aria-live="polite">
      <p className="font-semibold">You&apos;ll earn {formatAud(awardCents)} in Equestrian Rewards.</p>
      <p className="text-xs text-emerald-800">Added to your account once your order ships. Use it on a future order.</p>
    </div>
  );
}
