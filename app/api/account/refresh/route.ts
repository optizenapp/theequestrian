import { NextRequest, NextResponse } from 'next/server';
import { getCustomerAccountConfig, safeReturnPath } from '@/lib/customer-account/config';
import { getCustomerAccountEndpoints } from '@/lib/customer-account/discovery';
import {
  CUSTOMER_SESSION_COOKIE,
  clearCustomerSession,
  readCustomerSession,
  writeCustomerSession,
} from '@/lib/customer-account/session';
import { refreshCustomerSession } from '@/lib/customer-account/tokens';
import { getCanonicalSiteUrl } from '@/lib/seo/site-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server components can't set cookies, so pages bounce through here when the access token
 * has expired. A failed refresh signs the rider out rather than looping.
 */
export async function GET(request: NextRequest) {
  const config = getCustomerAccountConfig();
  if (!config) return new NextResponse('Not found', { status: 404 });

  const returnTo = safeReturnPath(request.nextUrl.searchParams.get('return_to'));
  const session = readCustomerSession(request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value, config);
  const response = NextResponse.redirect(`${getCanonicalSiteUrl()}${returnTo}`);
  if (!session) return response;

  try {
    const endpoints = await getCustomerAccountEndpoints(config);
    writeCustomerSession(response, await refreshCustomerSession(config, endpoints, session), config);
  } catch (error) {
    console.warn('[account/refresh] Refresh failed; signing out:', error);
    clearCustomerSession(response);
  }
  return response;
}
