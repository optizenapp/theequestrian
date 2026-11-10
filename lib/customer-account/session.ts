import type { NextResponse } from 'next/server';
import type { CustomerAccountConfig } from './config';
import { sealJson, unsealJson } from './session-crypto';

export const CUSTOMER_SESSION_COOKIE = 'te_customer';
export const CUSTOMER_OAUTH_COOKIE = 'te_customer_oauth';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const OAUTH_MAX_AGE = 60 * 10;

export type CustomerSession = {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
};

export type OAuthState = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
};

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

export function readCustomerSession(value: string | undefined, config: CustomerAccountConfig): CustomerSession | null {
  return unsealJson<CustomerSession>(value, config.sessionSecret, 'session');
}

export function isSessionExpired(session: CustomerSession, skewMs = 60_000): boolean {
  return Date.now() + skewMs >= session.expiresAt;
}

export function writeCustomerSession(response: NextResponse, session: CustomerSession, config: CustomerAccountConfig): void {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, sealJson(session, config.sessionSecret, 'session'), cookieOptions(SESSION_MAX_AGE));
}

export function clearCustomerSession(response: NextResponse): void {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, '', cookieOptions(0));
}

export function readOAuthState(value: string | undefined, config: CustomerAccountConfig): OAuthState | null {
  return unsealJson<OAuthState>(value, config.sessionSecret, 'oauth');
}

export function writeOAuthState(response: NextResponse, oauth: OAuthState, config: CustomerAccountConfig): void {
  response.cookies.set(CUSTOMER_OAUTH_COOKIE, sealJson(oauth, config.sessionSecret, 'oauth'), cookieOptions(OAUTH_MAX_AGE));
}

export function clearOAuthState(response: NextResponse): void {
  response.cookies.set(CUSTOMER_OAUTH_COOKIE, '', cookieOptions(0));
}
