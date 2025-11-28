'use client';

import { useState, useEffect } from 'react';
import { MegaMenu } from './MegaMenu';
import { MegaMenuLoader } from './MegaMenuLoader';

interface MegaMenuWrapperProps {
  categoryLabel: string;
}

interface SubcategoryItem {
  handle: string;
  label: string;
  count: number;
}

/**
 * Client wrapper that fetches mega menu subcategories from mapping
 */
export function MegaMenuWrapper({ categoryLabel }: MegaMenuWrapperProps) {
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Convert menu label to URL-safe handle
        const categoryHandle = categoryLabel.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');

        // Fetch subcategories from our mapping API
        const response = await fetch(`/api/mapping/subcategories?category=${categoryHandle}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch subcategories');
        }
        
        const data = await response.json();
        setSubcategories(data.subcategories || []);
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
    />
  );
}
