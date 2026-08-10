import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens } from '@/lib/gmc/oauth';
import { getGmcIntegration, saveGmcIntegration } from '@/lib/db/gmc';
import { ensureGmcDatafeed } from '@/lib/gmc/content';

export async function GET(request: Request) {
  // Do not require the admin-auth cookie here. Google redirects back as a
  // top-level navigation and that session cookie is often missing; CSRF is
  // enforced via the short-lived gmc-oauth-state cookie set when auth starts.
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get('gmc-oauth-state')?.value;

  const adminFeedsUrl = (reason?: string) => {
    const url = new URL('/admin/feeds', new URL(request.url).origin);
    if (reason) {
      url.searchParams.set('gmc', 'error');
      url.searchParams.set('reason', reason);
    } else {
      url.searchParams.set('gmc', 'connected');
    }
    return url;
  };

  if (error) {
    return NextResponse.redirect(adminFeedsUrl(error));
  }

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(adminFeedsUrl('invalid_state'));
  }

  try {
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

    const response = NextResponse.redirect(adminFeedsUrl());
    response.cookies.set('gmc-oauth-state', '', { maxAge: 0, path: '/' });

    try {
      if (existing?.merchant_id) {
        await ensureGmcDatafeed();
      }
    } catch (err) {
      console.error('[GMC] Failed to ensure datafeed:', err);
    }

    return response;
  } catch (err) {
    console.error('[GMC] OAuth callback failed:', err);
    return NextResponse.redirect(
      adminFeedsUrl(err instanceof Error ? err.message.slice(0, 120) : 'token_exchange_failed')
    );
  }
}
