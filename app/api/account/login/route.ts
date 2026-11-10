import { NextRequest, NextResponse } from 'next/server';
import { getCustomerAccountConfig, safeReturnPath } from '@/lib/customer-account/config';
import { getCustomerAccountEndpoints } from '@/lib/customer-account/discovery';
import { writeOAuthState } from '@/lib/customer-account/session';
import { pkceChallenge, randomToken } from '@/lib/customer-account/session-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const config = getCustomerAccountConfig();
  if (!config) return new NextResponse('Not found', { status: 404 });

  try {
    const endpoints = await getCustomerAccountEndpoints(config);
    const oauth = {
      state: randomToken(16),
      nonce: randomToken(16),
      verifier: randomToken(32),
      returnTo: safeReturnPath(request.nextUrl.searchParams.get('return_to')),
    };
    const authorizeUrl = new URL(endpoints.authorizationEndpoint);
    authorizeUrl.search = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUri,
      scope: 'openid email customer-account-api:full',
      state: oauth.state,
      nonce: oauth.nonce,
      code_challenge: pkceChallenge(oauth.verifier),
      code_challenge_method: 'S256',
    }).toString();

    const response = NextResponse.redirect(authorizeUrl.toString());
    writeOAuthState(response, oauth, config);
    return response;
  } catch (error) {
    console.error('[account/login] Failed to start sign-in:', error);
    return new NextResponse('Sign-in is temporarily unavailable', { status: 502 });
  }
}
