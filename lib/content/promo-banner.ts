/**
 * Time-boxed homepage promo banner. While active it renders in place of the
 * `hero` home section; the slider rows in `home_sections` are untouched and
 * return automatically once `endsAt` passes.
 *
 * Times are ISO strings with an explicit offset (Adelaide, ACDT +10:30).
 * The homepage is ISR (300s), so the switch happens within ~5 minutes of each boundary.
 */

export interface PromoBannerImage {
  src: string;
  width: number;
  height: number;
}

export interface PromoBannerConfig {
  key: string;
  startsAt: string;
  endsAt: string;
  /** Visually hidden page H1 (the slider normally supplies it). */
  heading: string;
  alt: string;
  href: string;
  desktop: PromoBannerImage | null;
  mobile: PromoBannerImage | null;
  /** Scrolling header strip messages; each links to `href`. */
  announcements: string[];
  /** Replaces the "Sale" menu pill label while active. */
  navLabel: string;
}

/** Serializable subset passed from the root layout to the client header. */
export type HeaderPromo = {
  endsAt: string;
  href: string;
  navLabel: string;
  announcements: string[];
};

export const PROMO_BANNER: PromoBannerConfig = {
  key: 'black-friday-2026',
  startsAt: '2026-11-12T00:00:00+10:30',
  endsAt: '2026-12-02T00:00:00+10:30',
  heading: 'Black Friday Sale | The Equestrian',
  alt: 'Black Friday Sale at The Equestrian',
  href: '/on-sale',
  desktop: { src: '/hero-black-friday-desktop.jpg', width: 1024, height: 320 },
  mobile: { src: '/hero-black-friday-mobile.jpg', width: 853, height: 1024 },
  announcements: [
    'Black Friday Sale',
    'Friday 13 November to Tuesday 1 December',
    'Shop Black Friday deals',
  ],
  navLabel: 'Black Friday Sale',
};

export function getActiveHeaderPromo(): HeaderPromo | null {
  const banner = getActivePromoBanner();
  if (!banner) return null;
  const { endsAt, href, navLabel, announcements } = banner;
  return { endsAt, href, navLabel, announcements };
}

/** Set PROMO_BANNER_PREVIEW=1 locally to show the banner outside its window. */
export function getActivePromoBanner(nowMs: number = Date.now()): PromoBannerConfig | null {
  const banner = PROMO_BANNER;
  if (!banner.desktop) return null;

  if (process.env.PROMO_BANNER_PREVIEW === '1') return banner;

  const start = Date.parse(banner.startsAt);
  const end = Date.parse(banner.endsAt);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return nowMs >= start && nowMs < end ? banner : null;
}
