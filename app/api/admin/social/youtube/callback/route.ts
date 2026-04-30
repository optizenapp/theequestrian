import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { decryptToken, getSocialCredential, saveSocialCredential } from '@/lib/social/credentials';
import { exchangeYoutubeCodeForTokens, getYoutubeChannelProfile } from '@/lib/social/youtube-oauth';

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get('youtube-oauth-state')?.value;

    const destination = new URL('/admin/social-channels', request.url);

    if (error) {
      destination.searchParams.set('youtube', 'error');
      destination.searchParams.set('reason', error);
      return NextResponse.redirect(destination);
    }

    if (!code || !state || !stateCookie || state !== stateCookie) {
      destination.searchParams.set('youtube', 'error');
      destination.searchParams.set('reason', 'invalid_state');
      return NextResponse.redirect(destination);
    }

    const token = await exchangeYoutubeCodeForTokens(code);
    const existing = await getSocialCredential('youtube');
    const profile = await getYoutubeChannelProfile(token.access_token);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);
    const existingRefreshToken = existing?.refreshToken ? decryptToken(existing.refreshToken) : null;

    await saveSocialCredential({
      channel: 'youtube',
      accountLabel: `@${profile.title.replace(/\s+/g, '')}`,
      externalAccountId: profile.channelId,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? existingRefreshToken,
      expiresAt,
      scopes: token.scope,
      metadata: {
        profileTitle: profile.title,
      },
    });

    destination.searchParams.set('youtube', 'connected');
    const response = NextResponse.redirect(destination);
    response.cookies.set('youtube-oauth-state', '', { maxAge: 0 });
    return response;
  } catch (error) {
    const destination = new URL('/admin/social-channels', request.url);
    const message = error instanceof Error ? error.message : 'YouTube OAuth callback failed';
    destination.searchParams.set('youtube', 'error');
    destination.searchParams.set('reason', message);
    return NextResponse.redirect(destination);
  }
}
