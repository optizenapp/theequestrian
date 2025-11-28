'use client';

import { useState, useEffect } from 'react';
import { MegaMenu } from './MegaMenu';
import { MegaMenuLoader } from './MegaMenuLoader';
import { getShopifyCollectionHandle } from '@/lib/navigation/menu-structure';
import type { CollectionWithParent } from '@/types/shopify';
import type { SubcategoryOption } from '@/lib/filters/category-filter';

interface MegaMenuWrapperProps {
  categoryLabel: string;
}

interface MegaMenuData {
  collection: CollectionWithParent;
  productTypeSubcategories: SubcategoryOption[];
  childCollections: CollectionWithParent[];
}

/**
 * Client wrapper that fetches mega menu data
 */
export function MegaMenuWrapper({ categoryLabel }: MegaMenuWrapperProps) {
  const [data, setData] = useState<MegaMenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const collectionHandle = getShopifyCollectionHandle(categoryLabel);
        
        if (!collectionHandle) {
          setError('No collection handle found');
          setIsLoading(false);
          return;
        }

        // Fetch collection data
        const collectionResponse = await fetch(
          `/api/admin/get-collection?handle=${collectionHandle}`
        );
        
        if (!collectionResponse.ok) {
          throw new Error('Failed to fetch collection');
        }
        
        const collectionData = await collectionResponse.json();

        // Fetch subcategories (product types)
        const subcategoriesResponse = await fetch(
          `/api/admin/list-subcategories?handle=${collectionHandle}`
        );
        
        const subcategoriesData = subcategoriesResponse.ok
          ? await subcategoriesResponse.json()
          : { subcategories: [] };

        // Fetch all collections to find child collections
        const collectionsResponse = await fetch('/api/admin/list-collections');
        const collectionsData = collectionsResponse.ok
          ? await collectionsResponse.json()
          : { allCollections: [] };

        // Filter child collections (collections that might be subcategories)
        const childCollections = collectionsData.allCollections?.filter(
          (col: CollectionWithParent) => 
            col.handle?.startsWith(`${collectionHandle}-`) ||
            col.title?.toLowerCase().includes(categoryLabel.toLowerCase())
        ) || [];

        setData({
          collection: collectionData.collection,
          productTypeSubcategories: subcategoriesData.subcategories || [],
          childCollections: childCollections.slice(0, 6), // Limit to 6 for display
        });
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

  if (error || !data) {
    return null; // Silently fail - don't show error in mega menu
  }

  return (
    <MegaMenu
      collection={data.collection}
      productTypeSubcategories={data.productTypeSubcategories}
      childCollections={data.childCollections}
    />
  );
}
