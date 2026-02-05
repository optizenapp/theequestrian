import { cookies } from 'next/headers';

export async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('admin-auth')?.value === 'true';
}
