import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminRequest } from '@/lib/admin/auth';
import { exchangeCodeForTokens } from '@/lib/gmc/oauth';
import { getGmcIntegration, saveGmcIntegration } from '@/lib/db/gmc';
import { ensureGmcDatafeed } from '@/lib/gmc/content';

export async function GET(request: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const stateCookie = cookies().get('gmc-oauth-state')?.value;

  if (error) {
    return NextResponse.redirect(`/admin/feeds?gmc=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect('/admin/feeds?gmc=error&reason=invalid_state');
  }

  const tokenResponse = await exchangeCodeForTokens(code);
  const tokenExpiry = new Date(Date.now() + tokenResponse.expires_in * 1000);
  const existing = await getGmcIntegration();

  await saveGmcIntegration({
    merchantId: existing?.merchant_id ?? null,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token ?? existing?.refresh_token ?? null,
    tokenExpiry,
    scope: tokenResponse.scope,
  });

  const response = NextResponse.redirect('/admin/feeds?gmc=connected');
  response.cookies.set('gmc-oauth-state', '', { maxAge: 0 });

  try {
    if (existing?.merchant_id) {
      await ensureGmcDatafeed();
    }
  } catch (err) {
    console.error('[GMC] Failed to ensure datafeed:', err);
  }

  return response;
}
