import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { buildYoutubeAuthUrl } from '@/lib/social/youtube-oauth';

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const state = crypto.randomUUID();
    const redirectUrl = buildYoutubeAuthUrl(state);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('youtube-oauth-state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start YouTube OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
