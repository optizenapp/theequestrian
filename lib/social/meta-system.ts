import { getFacebookPageProfile, getLinkedInstagramAccount } from './facebook-oauth';

export type MetaSystemCredential = {
  source: 'system';
  pageId: string;
  pageName: string;
  accessToken: string;
  systemUserAccessToken: string;
  instagramId: string | null;
  instagramUsername: string | null;
};

export async function getMetaSystemCredential(): Promise<MetaSystemCredential | null> {
  const accessToken = process.env.FACEBOOK_SYSTEM_USER_ACCESS_TOKEN?.trim();
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim();
  if (!accessToken || !pageId) return null;

  const page = await getFacebookPageProfile(pageId, accessToken);
  if (!page.accessToken) {
    throw new Error('System user token could not resolve a Page access token for Facebook publishing');
  }
  const configuredInstagramId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
  const linkedInstagram = await getLinkedInstagramAccount(page.id, page.accessToken);
  const instagramId = configuredInstagramId || linkedInstagram?.id || null;
  return {
    source: 'system',
    pageId: page.id,
    pageName: page.name,
    accessToken: page.accessToken,
    systemUserAccessToken: accessToken,
    instagramId,
    instagramUsername: linkedInstagram?.username ?? null,
  };
}
