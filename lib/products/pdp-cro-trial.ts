/**
 * PDP CRO layout trial.
 *
 * 1) **Local preview (recommended):** open any PDP that already loads, append `?cro=1`
 *    (only works when `NODE_ENV === 'development'`).
 *
 * 2) **Fixed handle (optional):** set `NEXT_PUBLIC_PDP_CRO_TRIAL_HANDLE` or
 *    `PDP_CRO_TRIAL_HANDLE` to a handle that exists in your Storefront catalog.
 */

export type PdpSearchParams = { [key: string]: string | string[] | undefined };

export function getPdpCroTrialHandle(): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_PDP_CRO_TRIAL_HANDLE?.trim() ||
    process.env.PDP_CRO_TRIAL_HANDLE?.trim();
  return fromEnv || null;
}

export function isPdpCroTrialHandle(handle: string): boolean {
  const t = getPdpCroTrialHandle();
  return t !== null && handle === t;
}

function croQueryValue(searchParams: PdpSearchParams): string | undefined {
  const raw = searchParams.cro;
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Dev-only: `?cro=1` or `?cro=true` on the PDP URL. */
export function isPdpCroDevQueryEnabled(searchParams: PdpSearchParams): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  const v = croQueryValue(searchParams)?.toLowerCase();
  return v === '1' || v === 'true';
}

export function shouldRenderPdpCroLayout(
  productHandle: string,
  searchParams: PdpSearchParams
): boolean {
  return isPdpCroTrialHandle(productHandle) || isPdpCroDevQueryEnabled(searchParams);
}
