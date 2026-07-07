'use client';

import Link from 'next/link';

interface SubcategoryItem {
  handle: string;
  label: string;
  count: number;
  image?: {
    url: string;
    altText: string;
    width: number;
    height: number;
  } | null;
}

interface FeaturedImage {
  url: string;
  altText: string;
  width: number;
  height: number;
  productTitle: string;
  subtitle?: string;
  link?: string;
  fallbackUrl?: string;
}

interface CustomQuickLink {
  title: string;
  imageUrl: string;
  link: string;
}

interface CustomSubcategoryCard {
  title: string;
  imageUrl: string;
  link: string;
}

interface MegaMenuProps {
  categoryLabel: string;
  subcategories: SubcategoryItem[];
  featuredImage?: FeaturedImage | null;
  customQuickLinks?: CustomQuickLink[] | null;
  customSubcategoryCards?: CustomSubcategoryCard[] | null;
  onClose?: () => void;
}

/**
 * Mega Menu Component
 * 
 * Modern ecommerce mega menu inspired by Back Market
 * Features:
 * - Full-width dropdown
 * - Grid layout with subcategories from mapping
 * - Clean, professional design
 * - Smooth animations
 */
export function MegaMenu({
  categoryLabel,
  subcategories,
  featuredImage,
  customQuickLinks,
  customSubcategoryCards,
  onClose,
}: MegaMenuProps) {
  const normalizeMenuHref = (rawHref: string | undefined, fallback: string): string => {
    const value = (rawHref || '').trim();
    if (!value) return fallback;
    if (value.startsWith('/')) return value;
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        const normalizedPath = `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
        return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
      } catch {
        return fallback;
      }
    }
    if (value.startsWith('#') || value.startsWith('?')) return fallback;
    return value.startsWith('/') ? value : `/${value}`;
  };

  const categoryHandle = categoryLabel.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');

  const normalizeKey = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const getSubcategoryImageFallback = (link: string, title: string): string => {
    const normalizedLink = normalizeMenuHref(link, `/${categoryHandle}`);
    const linkParts = normalizedLink.split('/').filter(Boolean);
    const handleFromLink = linkParts[0] === categoryHandle ? linkParts[1] : undefined;

    if (handleFromLink) {
      const byHandle = subcategories.find((sub) => sub.handle === handleFromLink);
      if (byHandle?.image?.url) {
        return byHandle.image.url;
      }
    }

    const byTitle = subcategories.find((sub) => normalizeKey(sub.label) === normalizeKey(title));
    return byTitle?.image?.url || '';
  };

  const handleImageLoadError = (
    event: React.SyntheticEvent<HTMLImageElement>,
    fallbackUrl: string
  ) => {
    if (!fallbackUrl) return;
    if (event.currentTarget.src === fallbackUrl) return;
    event.currentTarget.src = fallbackUrl;
  };

  const categoryHeroFallback =
    featuredImage?.fallbackUrl || subcategories.find((sub) => sub.image?.url)?.image?.url || '';
  
  // Use custom subcategory cards if provided, otherwise use auto-generated from mapping
  const cardsToShow: Array<{
    title: string;
    imageUrl: string;
    link: string;
    count?: number;
  }> = customSubcategoryCards
    ? customSubcategoryCards.map((card) => ({
        title: card.title,
        imageUrl: card.imageUrl || getSubcategoryImageFallback(card.link, card.title),
        link: normalizeMenuHref(card.link, `/${categoryHandle}`),
      }))
    : subcategories.slice(0, 6).map(sub => ({
        title: sub.label,
        imageUrl: sub.image?.url || '',
        link: normalizeMenuHref(`/${categoryHandle}/${sub.handle}`, `/${categoryHandle}`),
        count: sub.count
      }));
  
  // Use custom quick links if available, otherwise use first 2 from cards
  const quickLinksToShow = customQuickLinks || cardsToShow.slice(0, 2).map(card => ({
    title: card.title,
    imageUrl: card.imageUrl,
    link: normalizeMenuHref(card.link, `/${categoryHandle}`)
  }));

  if (cardsToShow.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-surface border border-gray-100 rounded-3xl shadow-2xl overflow-hidden relative">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10 text-gray-600"
        aria-label="Close menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-400 mb-1">Featured</p>
            <h3 className="text-2xl font-semibold text-gray-900">
              {categoryLabel}
            </h3>
          </div>
          <Link
            href={`/${categoryHandle}`}
            className="text-sm font-semibold text-action hover:underline transition"
            onClick={onClose}
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 lg:items-end">
          {/* Featured hero image - Hidden on small screens */}
          <div className="hidden lg:flex lg:flex-col space-y-4">
            {featuredImage ? (
              <Link
                href={normalizeMenuHref(featuredImage.link, `/${categoryHandle}`)}
                className="group block rounded-3xl overflow-hidden h-[220px] relative bg-gray-100"
                onClick={onClose}
              >
                <img
                  src={featuredImage.url}
                  alt={featuredImage.altText}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="eager"
                  decoding="async"
                  onError={(event) => handleImageLoadError(event, categoryHeroFallback)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="font-semibold text-lg mb-1">{featuredImage.productTitle}</p>
                  {featuredImage.subtitle && (
                    <p className="text-sm text-white/90">{featuredImage.subtitle}</p>
                  )}
                </div>
              </Link>
            ) : (
              <div className="rounded-3xl bg-gradient-to-br from-pink-100 via-white to-purple-100 h-[220px] overflow-hidden">
                <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(29,196,198,0.4),_transparent_60%)] flex flex-col justify-end p-6">
                  <p className="text-white font-semibold text-lg">Our Spotlight Collection</p>
                  <p className="text-sm text-white/80">Premium gear curated weekly.</p>
                </div>
              </div>
            )}
            
            {/* Quick links - custom or auto-generated */}
            <div className="grid gap-4 sm:grid-cols-2">
              {quickLinksToShow.map((quickLink, index) => (
                <Link
                  key={`${quickLink.title}-${index}`}
                  href={normalizeMenuHref(quickLink.link, `/${categoryHandle}`)}
                  className="group rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                  onClick={onClose}
                >
                  {quickLink.imageUrl ? (
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <img
                        src={quickLink.imageUrl}
                        alt={quickLink.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        onError={(event) =>
                          handleImageLoadError(
                            event,
                            getSubcategoryImageFallback(quickLink.link, quickLink.title)
                          )
                        }
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest flex-shrink-0">
                      {quickLink.title.substring(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{quickLink.title}</p>
                    <p className="text-xs text-gray-500">Shop now</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Subcategory list - 6 items in 2 columns (3 rows) - Rectangular cards like quick links */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {cardsToShow.map((card, index) => {
              return (
                <Link
                  key={card.link || index}
                  href={normalizeMenuHref(card.link, `/${categoryHandle}`)}
                  className="group rounded-2xl border border-gray-100 bg-white shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                  onClick={onClose}
                >
                  {/* Product Image */}
                  {(card.imageUrl || getSubcategoryImageFallback(card.link, card.title)) ? (
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                      {(() => {
                        const fallbackUrl = getSubcategoryImageFallback(card.link, card.title);
                        return (
                      <img
                        src={card.imageUrl || fallbackUrl}
                        alt={card.title}
                        className="w-full h-full object-cover"
                        loading="eager"
                        decoding="async"
                        onError={(event) => handleImageLoadError(event, fallbackUrl)}
                      />
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest flex-shrink-0">
                      {card.title.substring(0, 2)}
                    </div>
                  )}
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{card.title}</p>
                    <p className="text-xs text-gray-500">
                      {card.count && card.count > 0
                        ? `${card.count} ${card.count === 1 ? 'item' : 'items'}`
                        : 'Shop now'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
