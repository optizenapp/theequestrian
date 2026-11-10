import { cookies } from 'next/headers';
import { getCustomerAccountConfig } from './config';
import { CUSTOMER_SESSION_COOKIE, isSessionExpired, readCustomerSession } from './session';

/** Returns a usable access token for the signed-in rider, or null when signed out or expired. */
export async function getActiveCustomerAccessToken(): Promise<string | null> {
  const config = getCustomerAccountConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  const session = readCustomerSession(cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value, config);
  if (!session || isSessionExpired(session)) return null;
  return session.accessToken;
}
