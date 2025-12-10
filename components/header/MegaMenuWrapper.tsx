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

/**
 * Client wrapper that fetches mega menu subcategories from mapping
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
        setIsLoading(true);
        setError(null);

        // Convert menu label to URL-safe handle
        const categoryHandle = categoryLabel.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');

        // Use the images endpoint for Horse category, regular endpoint for others
        const endpoint = categoryHandle === 'horse' 
          ? `/api/mapping/subcategories-with-images?category=${categoryHandle}`
          : `/api/mapping/subcategories?category=${categoryHandle}`;

        // Fetch subcategories from our mapping API
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error('Failed to fetch subcategories');
        }
        
        const data = await response.json();
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
