/**
 * Copiq API Authentication
 * 
 * Verifies Bearer token against stored API key for Copiq integration.
 * 
 * Usage:
 *   const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '');
 *   if (!verifyCopiqApiKey(apiKey)) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 */

export function verifyCopiqApiKey(apiKey: string | null): boolean {
  if (!apiKey) {
    console.warn('[Copiq Auth] No API key provided in request');
    return false;
  }

  const expectedKey = process.env.COPIQ_API_KEY;
  
  if (!expectedKey) {
    console.error('[Copiq Auth] COPIQ_API_KEY not configured in environment variables');
    return false;
  }

  const isValid = apiKey === expectedKey;
  
  if (!isValid) {
    console.warn('[Copiq Auth] Invalid API key attempt from request');
  }

  return isValid;
}
