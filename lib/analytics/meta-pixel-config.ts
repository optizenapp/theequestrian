const ENABLED_VALUES = new Set(['1', 'true', 'yes']);

function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return Boolean(raw && ENABLED_VALUES.has(raw));
}

/** Public Pixel ID. Never a CAPI token. */
export function getMetaPixelId(): string | null {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (!id) return null;
  if (id === '247082982747711') return null;
  return id;
}

export function isMetaStorefrontTrackingEnabled(): boolean {
  return envFlag('NEXT_PUBLIC_META_STOREFRONT_TRACKING_ENABLED') && Boolean(getMetaPixelId());
}

export function isMetaStorefrontInitiateCheckoutEnabled(): boolean {
  return (
    isMetaStorefrontTrackingEnabled() &&
    envFlag('NEXT_PUBLIC_META_STOREFRONT_INITIATE_CHECKOUT_ENABLED')
  );
}
