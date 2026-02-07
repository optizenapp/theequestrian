import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminRequest } from '@/lib/admin/auth';
import { exchangeCodeForTokens } from '@/lib/gmc/oauth';
import { getGmcIntegration, saveGmcIntegration } from '@/lib/db/gmc';
import { ensureGmcDatafeed } from '@/lib/gmc/content';

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get('gmc-oauth-state')?.value;

  const adminFeedsUrl = (reason?: string) => {
    const base = new URL(request.url);
    const url = new URL('/admin/feeds', base);
    if (reason) {
      url.searchParams.set('gmc', 'error');
      url.searchParams.set('reason', reason);
    }
    return url;
  };

  if (error) {
    return NextResponse.redirect(adminFeedsUrl(error));
  }

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(adminFeedsUrl('invalid_state'));
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

  const successUrl = adminFeedsUrl();
  successUrl.searchParams.set('gmc', 'connected');
  const response = NextResponse.redirect(successUrl);
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
