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
export type PdpCroVariant = 'control' | 'cro1' | 'cro2';

function isPdpCroQueryPreviewEnabled(): boolean {
  return process.env.PDP_CRO_QUERY_PREVIEW_ENABLED === 'true';
}

function isLocalCro2DefaultEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}

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
  if (!isPdpCroQueryPreviewEnabled()) return false;
  const v = croQueryValue(searchParams)?.toLowerCase();
  return v === '1' || v === 'true';
}

/** Dev-only: `?cro=2` on the PDP URL. */
export function isPdpCroTwoDevQueryEnabled(searchParams: PdpSearchParams): boolean {
  if (process.env.NODE_ENV !== 'development') return false;
  if (!isPdpCroQueryPreviewEnabled()) return false;
  return croQueryValue(searchParams)?.toLowerCase() === '2';
}

export function getPdpCroVariant(
  productHandle: string,
  searchParams: PdpSearchParams
): PdpCroVariant {
  if (isLocalCro2DefaultEnabled()) return 'cro2';
  if (isPdpCroTwoDevQueryEnabled(searchParams)) return 'cro2';
  if (isPdpCroTrialHandle(productHandle) || isPdpCroDevQueryEnabled(searchParams)) return 'cro1';
  return 'control';
}

export function shouldRenderPdpCroLayout(
  productHandle: string,
  searchParams: PdpSearchParams
): boolean {
  return getPdpCroVariant(productHandle, searchParams) !== 'control';
}

/**
 * Keep `?cro=` when sending users to the canonical PDP path so dev previews survive
 * `redirect()` / `permanentRedirect()` (they only receive a pathname by default).
 */
export function withPreservedPdpCroQuery(
  pathname: string,
  searchParams: PdpSearchParams
): string {
  if (!isPdpCroQueryPreviewEnabled()) return pathname;
  const raw = searchParams.cro;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === '') return pathname;
  const sep = pathname.includes('?') ? '&' : '?';
  return `${pathname}${sep}cro=${encodeURIComponent(v)}`;
}
