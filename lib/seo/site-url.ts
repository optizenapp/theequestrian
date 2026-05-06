const PRODUCTION_SITE_URL = 'https://www.theequestrian.com.au';

export function getCanonicalSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL).replace(/\/+$/, '');
}
