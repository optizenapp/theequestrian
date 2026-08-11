'use client';

import { useState, useEffect } from 'react';
import { getMegaMenuFetchKey } from '@/lib/navigation/menu-structure';
import { getShopifyImageUrl } from '@/lib/shopify/image-url';
import { MegaMenu } from './MegaMenu';
import { MegaMenuLoader } from './MegaMenuLoader';

interface MegaMenuWrapperProps {
  categoryLabel: string;
  onClose?: () => void;
}

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

interface MegaMenuData {
  subcategories: SubcategoryItem[];
  featuredImage: FeaturedImage | null;
  customQuickLinks: CustomQuickLink[] | null;
  customSubcategoryCards: CustomSubcategoryCard[] | null;
}

const menuCache = new Map<string, MegaMenuData>();
const THUMB_WIDTH = 112;
const FEATURED_WIDTH = 800;

function sizedUrl(url: string | undefined, width: number): string {
  if (!url) return '';
  return getShopifyImageUrl(url, width);
}

function preloadImage(url: string) {
  if (typeof window === 'undefined' || !url) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

function preloadMenuImages(data: MegaMenuData) {
  if (data.featuredImage?.url) {
    preloadImage(sizedUrl(data.featuredImage.url, FEATURED_WIDTH));
  }

  const thumbSources = [
    ...(data.subcategories || []).map((sub) => sub.image?.url),
    ...(data.customQuickLinks || []).map((link) => link.imageUrl),
    ...(data.customSubcategoryCards || []).map((card) => card.imageUrl),
  ].filter(Boolean) as string[];

  // Cap preloads — menu shows ~6–8 thumbs; avoid flooding the network
  for (const url of thumbSources.slice(0, 8)) {
    preloadImage(sizedUrl(url, THUMB_WIDTH));
  }
}

export type PrefetchMegaMenuOptions = {
  /** When false, only warm the JSON cache (default). */
  preloadImages?: boolean;
};

/**
 * Prefetch mega menu data for a category.
 * Call on hover to warm cache; optionally preload sized images.
 */
export async function prefetchMegaMenuData(
  categoryLabel: string,
  options: PrefetchMegaMenuOptions = {}
) {
  const { preloadImages = false } = options;
  const categoryHandle = getMegaMenuFetchKey(categoryLabel);
  if (!categoryHandle) return;

  const cached = menuCache.get(categoryHandle);
  if (cached) {
    if (preloadImages) preloadMenuImages(cached);
    return;
  }

  try {
    const endpoint = `/api/mapping/subcategories-with-images?category=${categoryHandle}`;
    const response = await fetch(endpoint);
    if (!response.ok) return;

    const data = await response.json();
    const menuData: MegaMenuData = {
      subcategories: data.subcategories || [],
      featuredImage: data.featuredImage || null,
      customQuickLinks: data.customQuickLinks || null,
      customSubcategoryCards: data.customSubcategoryCards || null,
    };

    menuCache.set(categoryHandle, menuData);
    if (preloadImages) preloadMenuImages(menuData);
  } catch (err) {
    console.debug('Prefetch failed for', categoryLabel, err);
  }
}

export function MegaMenuWrapper({ categoryLabel, onClose }: MegaMenuWrapperProps) {
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [featuredImage, setFeaturedImage] = useState<FeaturedImage | null>(null);
  const [customQuickLinks, setCustomQuickLinks] = useState<CustomQuickLink[] | null>(null);
  const [customSubcategoryCards, setCustomSubcategoryCards] = useState<CustomSubcategoryCard[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryHandle = getMegaMenuFetchKey(categoryLabel);
        if (!categoryHandle) {
          setIsLoading(false);
          return;
        }

        const cached = menuCache.get(categoryHandle);
        if (cached) {
          setSubcategories(cached.subcategories);
          setFeaturedImage(cached.featuredImage);
          setCustomQuickLinks(cached.customQuickLinks);
          setCustomSubcategoryCards(cached.customSubcategoryCards);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError(null);

        const endpoint = `/api/mapping/subcategories-with-images?category=${categoryHandle}`;
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error('Failed to fetch subcategories');
        }

        const data = await response.json();
        const menuData: MegaMenuData = {
          subcategories: data.subcategories || [],
          featuredImage: data.featuredImage || null,
          customQuickLinks: data.customQuickLinks || null,
          customSubcategoryCards: data.customSubcategoryCards || null,
        };

        menuCache.set(categoryHandle, menuData);
        setSubcategories(menuData.subcategories);
        setFeaturedImage(menuData.featuredImage);
        setCustomQuickLinks(menuData.customQuickLinks);
        setCustomSubcategoryCards(menuData.customSubcategoryCards);
      } catch (err) {
        console.error('Error fetching mega menu data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [categoryLabel]);

  if (isLoading) {
    return <MegaMenuLoader />;
  }

  if (error || subcategories.length === 0) {
    return null;
  }

  return (
    <MegaMenu
      categoryLabel={categoryLabel}
      subcategories={subcategories}
      featuredImage={featuredImage}
      customQuickLinks={customQuickLinks}
      customSubcategoryCards={customSubcategoryCards}
      onClose={onClose}
    />
  );
}
