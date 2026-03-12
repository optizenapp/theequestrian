/**
 * Copiq API Authentication
 * Verifies Bearer token against COPIQ_API_KEY.
 */

export function verifyCopiqApiKey(apiKey: string | null): boolean {
  if (!apiKey) {
    console.warn('[Copiq Auth] No API key provided in request');
    return false;
  }
  const expectedKey = process.env.COPIQ_API_KEY;
  if (!expectedKey) {
    console.error('[Copiq Auth] COPIQ_API_KEY not configured');
    return false;
  }
  const isValid = apiKey === expectedKey;
  if (!isValid) {
    console.warn('[Copiq Auth] Invalid API key attempt');
  }
  return isValid;
}
