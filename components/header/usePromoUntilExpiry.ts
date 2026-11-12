'use client';

import { useEffect, useState } from 'react';
import type { HeaderPromo } from '@/lib/content/promo-banner';

/** setTimeout overflows above ~24.8 days and would fire immediately. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/**
 * Returns the server-chosen promo, then drops it once `endsAt` passes.
 * Long-cached pages (PLPs revalidate every 48h) can otherwise keep showing it after the sale.
 */
export function usePromoUntilExpiry(promo: HeaderPromo | null): HeaderPromo | null {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!promo) return;
    const remaining = Date.parse(promo.endsAt) - Date.now();
    if (Number.isNaN(remaining) || remaining > MAX_TIMEOUT_MS) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [promo]);

  return expired ? null : promo;
}
