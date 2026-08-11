'use client';

import { updateCartAttributes } from '@/app/actions/cart';

type SdAttributionApi = {
  getIdentity?: () => unknown;
  flushOrderAttribution?: (force?: boolean) => void;
};

function getSdAttribution(): SdAttributionApi | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { sdAttribution?: SdAttributionApi }).sdAttribution;
}

export function readSdAttrPayload(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const api = getSdAttribution();
    if (api?.getIdentity) {
      // Prefer full cookie-shaped payload from localStorage when present
      const stored = localStorage.getItem('sd_attr');
      if (stored) return stored;
      return JSON.stringify(api.getIdentity());
    }
  } catch {
    // fall through
  }

  try {
    const fromCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sd_attr='))
      ?.slice('sd_attr='.length);
    if (fromCookie) return decodeURIComponent(fromCookie);
    return localStorage.getItem('sd_attr');
  } catch {
    return null;
  }
}

export function flushPerformBeforeCheckout(): void {
  getSdAttribution()?.flushOrderAttribution?.(true);
}

export async function syncPerformCartAttribute(cartId: string): Promise<void> {
  const payload = readSdAttrPayload();
  if (!payload) return;

  await updateCartAttributes(cartId, payload);
}
