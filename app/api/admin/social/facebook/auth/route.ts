import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { buildFacebookAuthUrl } from '@/lib/social/facebook-oauth';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const state = crypto.randomUUID();
    const redirectUrl = buildFacebookAuthUrl(state);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('facebook-oauth-state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Facebook OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
