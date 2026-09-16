const ENABLED_VALUES = new Set(['1', 'true', 'yes']);

function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return Boolean(raw && ENABLED_VALUES.has(raw));
}

declare global {
  interface Window {
    __TE_META_PIXEL_ID__?: string;
    __TE_META_TRACKING_ENABLED__?: boolean;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Public Pixel ID. Prefer runtime bootstrap, then build-time env. Never a CAPI token. */
export function getMetaPixelId(): string | null {
  if (typeof window !== 'undefined') {
    const runtime = window.__TE_META_PIXEL_ID__?.trim();
    if (runtime && runtime !== '247082982747711') return runtime;
  }
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (!id) return null;
  if (id === '247082982747711') return null;
  return id;
}

export function isMetaStorefrontTrackingEnabled(): boolean {
  if (typeof window !== 'undefined' && window.__TE_META_TRACKING_ENABLED__ === true) {
    return Boolean(getMetaPixelId());
  }
  return envFlag('NEXT_PUBLIC_META_STOREFRONT_TRACKING_ENABLED') && Boolean(getMetaPixelId());
}

export function isMetaStorefrontInitiateCheckoutEnabled(): boolean {
  return (
    isMetaStorefrontTrackingEnabled() &&
    envFlag('NEXT_PUBLIC_META_STOREFRONT_INITIATE_CHECKOUT_ENABLED')
  );
}
