'use client';

import { useEffect, useState } from 'react';
import { formatAud } from '@/lib/rewards/money';

type Props = {
  cartId: string | null | undefined;
  /** Changes whenever quantities, lines or discounts change, so the estimate refreshes. */
  cartVersion: string;
  className?: string;
};

type EstimateResponse = {
  enabled?: boolean;
  estimate?: { awardCents: number } | null;
};

export default function RewardsEstimate({ cartId, cartVersion, className = '' }: Props) {
  const [awardCents, setAwardCents] = useState<number | null>(null);

  useEffect(() => {
    if (!cartId) {
      setAwardCents(null);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch('/api/rewards/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId }),
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Estimate request failed (${response.status})`);
        const data = (await response.json()) as EstimateResponse;
        setAwardCents(data.enabled && data.estimate ? data.estimate.awardCents : null);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn('[RewardsEstimate] Estimate unavailable:', error);
        setAwardCents(null);
      }
    })();
    return () => controller.abort();
  }, [cartId, cartVersion]);

  if (awardCents === null || awardCents <= 0) return null;

  return (
    <div className={`rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ${className}`} aria-live="polite">
      <p className="font-semibold">You&apos;ll earn {formatAud(awardCents)} in Equestrian Rewards.</p>
      <p className="text-xs text-emerald-800">Available after your order is fulfilled.</p>
    </div>
  );
}
