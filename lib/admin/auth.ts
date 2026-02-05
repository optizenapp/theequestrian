import { cookies } from 'next/headers';

export function isAdminRequest(): boolean {
  return cookies().get('admin-auth')?.value === 'true';
}
