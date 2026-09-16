/** Numeric Shopify ID from a GID or already-plain id. Empty if unresolvable. */
export function normalizeShopifyNumericId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const last = trimmed.includes('/') ? trimmed.split('/').filter(Boolean).pop() : trimmed;
  if (!last) return null;
  if (!/^\d+$/.test(last)) return null;
  return last;
}

export function parseMajorUnitAmount(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric;
}

export function createMetaEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `meta_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}
