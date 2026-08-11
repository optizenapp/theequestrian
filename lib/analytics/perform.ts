'use client';

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

async function writeSdAttrToCart(cartId: string, payload: string): Promise<void> {
  const response = await fetch('/api/cart/attributes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartId,
      attributes: [{ key: '_sd_attr', value: payload }],
    }),
  });

  const text = await response.text();
  let data: { message?: string; userErrors?: Array<{ message: string }> } = {};
  if (text) {
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      // non-JSON body
    }
  }

  if (!response.ok) {
    throw new Error(data.message || `Cart attribute update failed (${response.status})`);
  }

  if (data.userErrors && data.userErrors.length > 0) {
    throw new Error(data.userErrors.map((e) => e.message).join(', '));
  }
}

/** Write `_sd_attr` after cart mutations (no flush). */
export async function syncPerformCartAttribute(cartId: string): Promise<void> {
  const payload = localStorage.getItem('sd_attr') || readSdAttrPayload();
  if (!payload) return;
  await writeSdAttrToCart(cartId, payload);
}

/**
 * Flush Perform identity, then await cart attribute write before checkout.
 * Network: POST /api/cart/attributes with body containing `_sd_attr`.
 */
export async function ensurePerformCartAttribute(cartId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  flushPerformBeforeCheckout();

  const payload = localStorage.getItem('sd_attr');
  if (!payload) return;

  await writeSdAttrToCart(cartId, payload);
}
