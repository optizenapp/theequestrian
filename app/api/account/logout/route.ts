import { NextRequest, NextResponse } from 'next/server';
import { getCustomerAccountConfig } from '@/lib/customer-account/config';
import { getCustomerAccountEndpoints } from '@/lib/customer-account/discovery';
import { CUSTOMER_SESSION_COOKIE, clearCustomerSession, readCustomerSession } from '@/lib/customer-account/session';
import { getCanonicalSiteUrl } from '@/lib/seo/site-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST-only so a cross-site link or image can't sign the rider out. */
export async function POST(request: NextRequest) {
  const config = getCustomerAccountConfig();
  if (!config) return new NextResponse('Not found', { status: 404 });

  const session = readCustomerSession(request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value, config);
  let destination = `${getCanonicalSiteUrl()}/`;
  try {
    const endpoints = await getCustomerAccountEndpoints(config);
    if (endpoints.endSessionEndpoint && session?.idToken) {
      const logoutUrl = new URL(endpoints.endSessionEndpoint);
      logoutUrl.search = new URLSearchParams({
        id_token_hint: session.idToken,
        post_logout_redirect_uri: config.postLogoutRedirectUri,
      }).toString();
      destination = logoutUrl.toString();
    }
  } catch (error) {
    console.error('[account/logout] Could not reach Shopify logout; clearing local session only:', error);
  }

  const response = NextResponse.redirect(destination, { status: 303 });
  clearCustomerSession(response);
  return response;
}
