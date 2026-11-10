import { NextRequest, NextResponse } from 'next/server';
import { attachCustomerToCart } from '@/lib/customer-account/cart-identity';
import { getCustomerAccountConfig } from '@/lib/customer-account/config';
import { getCustomerAccountEndpoints } from '@/lib/customer-account/discovery';
import {
  CUSTOMER_OAUTH_COOKIE,
  clearOAuthState,
  readOAuthState,
  writeCustomerSession,
} from '@/lib/customer-account/session';
import { exchangeAuthorizationCode, idTokenNonceMatches } from '@/lib/customer-account/tokens';
import { getCanonicalSiteUrl } from '@/lib/seo/site-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(reason: string): NextResponse {
  const response = NextResponse.redirect(`${getCanonicalSiteUrl()}/account?signin=failed`);
  clearOAuthState(response);
  console.warn('[account/callback] Sign-in failed:', reason);
  return response;
}

export async function GET(request: NextRequest) {
  const config = getCustomerAccountConfig();
  if (!config) return new NextResponse('Not found', { status: 404 });

  const params = request.nextUrl.searchParams;
  const oauth = readOAuthState(request.cookies.get(CUSTOMER_OAUTH_COOKIE)?.value, config);
  if (params.get('error')) return failure(`provider error: ${params.get('error')}`);
  const code = params.get('code');
  if (!oauth || !code || params.get('state') !== oauth.state) return failure('missing code or state mismatch');

  try {
    const endpoints = await getCustomerAccountEndpoints(config);
    const session = await exchangeAuthorizationCode(config, endpoints, code, oauth.verifier);
    if (!idTokenNonceMatches(session.idToken, oauth.nonce)) return failure('nonce mismatch');

    const cartId = request.cookies.get('shopify_cart_id')?.value;
    if (cartId) await attachCustomerToCart(cartId, session.accessToken);

    const response = NextResponse.redirect(`${getCanonicalSiteUrl()}${oauth.returnTo}`);
    clearOAuthState(response);
    writeCustomerSession(response, session, config);
    return response;
  } catch (error) {
    console.error('[account/callback] Token exchange failed:', error);
    return failure('token exchange error');
  }
}
