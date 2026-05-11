export const STORE_URL = 'https://www.theequestrian.com.au';
export const STORE_DISPLAY = 'theequestrian.com.au';

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/attheequestrian',
  instagram: 'https://instagram.com/theequestrianoz',
  youtube: 'https://www.youtube.com/channel/UCvcpt-fRaAY4PBavZicia1g',
} as const;

export const SOCIAL_HANDLES = {
  instagram: '@theequestrianoz',
} as const;

export type SocialLinkKey = keyof typeof SOCIAL_LINKS;

export function productUrl(handle: string): string {
  const clean = handle.replace(/^\/+|\/+$/g, '');
  return `${STORE_URL}/products/${clean}`;
}

export function brandCollectionUrl(handle: string): string {
  const clean = handle.replace(/^\/+|\/+$/g, '');
  return `${STORE_URL}/brands/${clean}`;
}

export function categoryCollectionUrl(handle: string): string {
  const clean = handle.replace(/^\/+|\/+$/g, '');
  return `${STORE_URL}/${clean}`;
}

export function buildFollowBlock(): string {
  return [
    `Follow ${SOCIAL_HANDLES.instagram}`,
    `Instagram: ${SOCIAL_LINKS.instagram}`,
    `Facebook: ${SOCIAL_LINKS.facebook}`,
    `YouTube: ${SOCIAL_LINKS.youtube}`,
  ].join('\n');
}
