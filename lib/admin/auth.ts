import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminSession } from './session';

export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
}
