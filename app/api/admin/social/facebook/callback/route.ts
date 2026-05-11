import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin/auth';
import { decryptToken, getSocialCredential, saveSocialCredential } from '@/lib/social/credentials';
import {
  exchangeFacebookCodeForToken,
  exchangeForLongLivedFacebookToken,
  getLinkedInstagramAccount,
  getManagedFacebookPages,
} from '@/lib/social/facebook-oauth';

type PageWithInstagram = Awaited<ReturnType<typeof getManagedFacebookPages>>[number] & {
  linkedInstagram: Awaited<ReturnType<typeof getLinkedInstagramAccount>>;
};

function resolveTokenExpiry(expiresIn: number | undefined): Date | null {
  if (!Number.isFinite(expiresIn) || !expiresIn || expiresIn <= 0) return null;
  return new Date(Date.now() + expiresIn * 1000);
}

function pageNameMatches(pageName: string, expectedName: string): boolean {
  const normalizedPage = pageName.trim().toLowerCase();
  const normalizedExpected = expectedName.trim().toLowerCase();
  return normalizedPage === normalizedExpected || normalizedPage.includes(normalizedExpected);
}

function describeAvailablePages(pages: PageWithInstagram[]): string {
  return pages
    .map((page) => `${page.name} (${page.id}${page.linkedInstagram?.username ? `, IG @${page.linkedInstagram.username}` : ''})`)
    .join('; ');
}

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
    const stateCookie = cookieStore.get('facebook-oauth-state')?.value;

    const destination = new URL('/admin/social-channels', request.url);

    if (error) {
      destination.searchParams.set('facebook', 'error');
      destination.searchParams.set('reason', error);
      return NextResponse.redirect(destination);
    }

    if (!code || !state || !stateCookie || state !== stateCookie) {
      destination.searchParams.set('facebook', 'error');
      destination.searchParams.set('reason', 'invalid_state');
      return NextResponse.redirect(destination);
    }

    const shortLivedToken = await exchangeFacebookCodeForToken(code);
    const longLivedToken = await exchangeForLongLivedFacebookToken(shortLivedToken.access_token);
    const managedPages = await getManagedFacebookPages(longLivedToken.access_token);
    if (managedPages.length === 0) {
      throw new Error('No managed Facebook Pages found for this account');
    }

    const configuredPageId = process.env.FACEBOOK_PAGE_ID?.trim();
    const configuredPageName = process.env.FACEBOOK_PAGE_NAME?.trim() || 'The Equestrian';
    const pagesWithInstagram: PageWithInstagram[] = [];
    for (const page of managedPages) {
      const linkedInstagram = await getLinkedInstagramAccount(page.id, page.accessToken);
      pagesWithInstagram.push({ ...page, linkedInstagram });
    }
    const selectedPage =
      (configuredPageId ? pagesWithInstagram.find((page) => page.id === configuredPageId) : null) ??
      pagesWithInstagram.find((page) => page.linkedInstagram && pageNameMatches(page.name, configuredPageName)) ??
      pagesWithInstagram.find((page) => pageNameMatches(page.name, configuredPageName));
    if (!selectedPage && (configuredPageId || configuredPageName)) {
      const availablePages = describeAvailablePages(pagesWithInstagram);
      throw new Error(
        `Configured Facebook Page not found. Expected ${configuredPageId || configuredPageName}. Available pages: ${availablePages || 'none'}`
      );
    }
    if (!selectedPage) {
      throw new Error('No managed Facebook Pages found for this account');
    }
    const linkedInstagram = selectedPage.linkedInstagram;
    const expiresAt = resolveTokenExpiry(longLivedToken.expires_in);

    await saveSocialCredential({
      channel: 'facebook',
      accountLabel: selectedPage.name,
      externalAccountId: selectedPage.id,
      accessToken: selectedPage.accessToken,
      refreshToken: longLivedToken.access_token,
      expiresAt,
      scopes: 'pages_show_list,pages_read_engagement,pages_manage_posts',
      metadata: {
        selectedPageId: selectedPage.id,
        selectedPageName: selectedPage.name,
        selectedPageAccessToken: selectedPage.accessToken,
        userAccessToken: longLivedToken.access_token,
        linkedInstagramId: linkedInstagram?.id ?? null,
        linkedInstagramUsername: linkedInstagram?.username ?? null,
        availablePages: pagesWithInstagram.map((page) => ({
          id: page.id,
          name: page.name,
          linkedInstagramId: page.linkedInstagram?.id ?? null,
          linkedInstagramUsername: page.linkedInstagram?.username ?? null,
        })),
      },
    });

    if (linkedInstagram) {
      const existingInstagram = await getSocialCredential('instagram');
      const existingInstagramRefreshToken = existingInstagram?.refreshToken ? decryptToken(existingInstagram.refreshToken) : null;
      await saveSocialCredential({
        channel: 'instagram',
        accountLabel: linkedInstagram.username ? `@${linkedInstagram.username}` : selectedPage.name,
        externalAccountId: linkedInstagram.id,
        accessToken: selectedPage.accessToken,
        refreshToken: existingInstagramRefreshToken ?? longLivedToken.access_token,
        expiresAt,
        scopes: 'instagram_basic,instagram_content_publish',
        metadata: {
          linkedPageId: selectedPage.id,
          linkedPageName: selectedPage.name,
          linkedInstagramId: linkedInstagram.id,
          linkedInstagramUsername: linkedInstagram.username,
          selectedPageAccessToken: selectedPage.accessToken,
          userAccessToken: longLivedToken.access_token,
        },
      });
    }

    destination.searchParams.set('facebook', 'connected');
    if (linkedInstagram) {
      destination.searchParams.set('instagram', 'connected');
    } else {
      destination.searchParams.set('instagram', 'not_linked');
    }
    const response = NextResponse.redirect(destination);
    response.cookies.set('facebook-oauth-state', '', { maxAge: 0 });
    return response;
  } catch (error) {
    const destination = new URL('/admin/social-channels', request.url);
    const message = error instanceof Error ? error.message : 'Facebook OAuth callback failed';
    destination.searchParams.set('facebook', 'error');
    destination.searchParams.set('reason', message);
    return NextResponse.redirect(destination);
  }
}
