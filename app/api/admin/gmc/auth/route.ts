import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { buildGmcAuthUrl } from '@/lib/gmc/oauth';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = crypto.randomUUID();
  const redirectUrl = buildGmcAuthUrl(state);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set('gmc-oauth-state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}
