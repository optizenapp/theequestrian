'use client';

import { useState, useEffect } from 'react';
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

// Cache for mega menu data to avoid refetching
const menuCache = new Map<string, MegaMenuData>();

/**
 * Preload an image by creating a new Image object
 * This tells the browser to fetch and cache the image
 */
function preloadImage(url: string) {
  if (typeof window === 'undefined') return;
  
  // Use link preload for better browser support
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Prefetch mega menu data for a category
 * Call this on hover to load data before menu opens
 */
export async function prefetchMegaMenuData(categoryLabel: string) {
  const categoryHandle = categoryLabel.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  
  // Don't prefetch if already cached
  if (menuCache.has(categoryHandle)) {
    return;
  }

  try {
    const endpoint = `/api/mapping/subcategories-with-images?category=${categoryHandle}`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      return;
    }
    
    const data = await response.json();
    
    // Cache the data
    menuCache.set(categoryHandle, {
      subcategories: data.subcategories || [],
      featuredImage: data.featuredImage || null,
      customQuickLinks: data.customQuickLinks || null,
      customSubcategoryCards: data.customSubcategoryCards || null,
    });
    
    // Preload featured image for instant display
    if (data.featuredImage?.url) {
      preloadImage(data.featuredImage.url);
    }
    
    // Preload subcategory images
    if (data.subcategories) {
      data.subcategories.forEach((sub: any) => {
        if (sub.image?.url) {
          preloadImage(sub.image.url);
        }
      });
    }
    
    // Preload custom quick link images
    if (data.customQuickLinks) {
      data.customQuickLinks.forEach((link: any) => {
        if (link.imageUrl) {
          preloadImage(link.imageUrl);
        }
      });
    }
    
    // Preload custom subcategory card images
    if (data.customSubcategoryCards) {
      data.customSubcategoryCards.forEach((card: any) => {
        if (card.imageUrl) {
          preloadImage(card.imageUrl);
        }
      });
    }
  } catch (err) {
    // Silently fail - prefetch is optional
    console.debug('Prefetch failed for', categoryLabel, err);
  }
}

/**
 * Client wrapper that fetches mega menu subcategories from mapping
 * Uses caching for instant display on subsequent hovers
 */
export function MegaMenuWrapper({ categoryLabel, onClose }: MegaMenuWrapperProps) {
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [featuredImage, setFeaturedImage] = useState<FeaturedImage | null>(null);
  const [customQuickLinks, setCustomQuickLinks] = useState<CustomQuickLink[] | null>(null);
  const [customSubcategoryCards, setCustomSubcategoryCards] = useState<CustomSubcategoryCard[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryHandle = categoryLabel.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
        
        // Check cache first for instant display
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
        
        // Cache the data for instant display next time
        menuCache.set(categoryHandle, {
          subcategories: data.subcategories || [],
          featuredImage: data.featuredImage || null,
          customQuickLinks: data.customQuickLinks || null,
          customSubcategoryCards: data.customSubcategoryCards || null,
        });
        
        setSubcategories(data.subcategories || []);
        setFeaturedImage(data.featuredImage || null);
        setCustomQuickLinks(data.customQuickLinks || null);
        setCustomSubcategoryCards(data.customSubcategoryCards || null);
      } catch (err) {
        console.error('Error fetching mega menu data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [categoryLabel]);

  if (isLoading) {
    return <MegaMenuLoader />;
  }

  if (error || subcategories.length === 0) {
    return null; // Silently fail - don't show error in mega menu
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
