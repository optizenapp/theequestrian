'use client';

/**
 * useLiveProductStatus Hook
 * 
 * Fetches real-time price and inventory data for products and merges it
 * with cached product data. This ensures users always see accurate pricing
 * and availability, even when the page HTML is served from cache.
 * 
 * @example
 * const hydratedProducts = useLiveProductStatus(cachedProducts);
 */

import { useEffect, useRef, useState } from 'react';
import type { ShopifyProduct } from '@/types/shopify';

interface ProductStatus {
  price: number;
  compareAtPrice?: number;
  stock: number;
  available: boolean;
}

interface ProductStatusMap {
  [productId: string]: ProductStatus;
}

interface LiveStatusOptions {
  deferMs?: number;
  mode?: 'soft' | 'strict';
}

export function useLiveProductStatus(products: ShopifyProduct[]): {
  products: ShopifyProduct[];
  isLoading: boolean;
  error: Error | null;
} {
  const [hydratedProducts, setHydratedProducts] = useState<ShopifyProduct[]>(products);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Skip if no products
    if (!products || products.length === 0) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchLiveStatus() {
      try {
        // Extract product IDs
        const productIds = products.map(p => p.id);

        console.log(`[useLiveProductStatus] Fetching live status for ${productIds.length} products`);

        // Fetch live status from API
        const response = await fetch('/api/products/status?mode=strict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIds }),
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch product status: ${response.statusText}`);
        }

        const statusMap: ProductStatusMap = await response.json();

        // Only update if component is still mounted
        if (!isMounted) return;

        // Merge live data with cached products
        const updatedProducts = products.map(product => {
          const liveStatus = statusMap[product.id];

          if (!liveStatus) {
            // No live data available, return original
            return product;
          }

          // Create updated product with live data
          return {
            ...product,
            availableForSale: liveStatus.available,
            totalInventory: liveStatus.stock,
            priceRange: {
              ...product.priceRange,
              minVariantPrice: {
                amount: liveStatus.price.toString(),
                currencyCode: product.priceRange.minVariantPrice.currencyCode,
              },
              maxVariantPrice: {
                amount: liveStatus.price.toString(),
                currencyCode: product.priceRange.maxVariantPrice.currencyCode,
              },
            },
            // Update compareAtPriceRange if available
            ...(liveStatus.compareAtPrice && {
              compareAtPriceRange: {
                minVariantPrice: {
                  amount: liveStatus.compareAtPrice.toString(),
                  currencyCode: product.priceRange.minVariantPrice.currencyCode,
                },
                maxVariantPrice: {
                  amount: liveStatus.compareAtPrice.toString(),
                  currencyCode: product.priceRange.maxVariantPrice.currencyCode,
                },
              },
            }),
          };
        });

        setHydratedProducts(updatedProducts);
        setIsLoading(false);
        console.log(`[useLiveProductStatus] ✅ Hydrated ${updatedProducts.length} products`);
      } catch (err) {
        console.error('[useLiveProductStatus] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsLoading(false);
          // On error, use cached products
          setHydratedProducts(products);
        }
      }
    }

    fetchLiveStatus();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [products]);

  return {
    products: hydratedProducts,
    isLoading,
    error,
  };
}

/**
 * Optimized version that only hydrates when products change
 * Uses a dependency on product IDs rather than the entire products array
 */
export function useLiveProductStatusOptimized(
  products: ShopifyProduct[],
  options?: LiveStatusOptions
): {
  products: ShopifyProduct[];
  isLoading: boolean;
  error: Error | null;
} {
  const [hydratedProducts, setHydratedProducts] = useState<ShopifyProduct[]>(products);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const productsRef = useRef(products);

  // Create stable product IDs string for dependency
  const productIdsKey = products.map(p => p.id).join(',');

  useEffect(() => {
    productsRef.current = products;
    // Keep rendered cards in sync with the latest server payload even when
    // product IDs are unchanged but fields like images have been refreshed.
    setHydratedProducts(products);
    setIsLoading(products.length > 0);
  }, [products]);

  useEffect(() => {
    const currentProducts = productsRef.current;

    if (!currentProducts || currentProducts.length === 0) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const delay = options?.deferMs ?? 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchLiveStatus() {
      try {
        const productIds = currentProducts.map(p => p.id);
        const mode = options?.mode === 'strict' ? 'strict' : 'soft';

        const response = await fetch(`/api/products/status?mode=${mode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIds }),
          cache: mode === 'strict' ? 'no-store' : 'default',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch product status: ${response.statusText}`);
        }

        const statusMap: ProductStatusMap = await response.json();

        if (!isMounted) return;

        const updatedProducts = currentProducts.map(product => {
          const liveStatus = statusMap[product.id];
          if (!liveStatus) return product;

          return {
            ...product,
            availableForSale: liveStatus.available,
            totalInventory: liveStatus.stock,
            priceRange: {
              ...product.priceRange,
              minVariantPrice: {
                amount: liveStatus.price.toString(),
                currencyCode: product.priceRange.minVariantPrice.currencyCode,
              },
              maxVariantPrice: {
                amount: liveStatus.price.toString(),
                currencyCode: product.priceRange.maxVariantPrice.currencyCode,
              },
            },
            ...(liveStatus.compareAtPrice && {
              compareAtPriceRange: {
                minVariantPrice: {
                  amount: liveStatus.compareAtPrice.toString(),
                  currencyCode: product.priceRange.minVariantPrice.currencyCode,
                },
                maxVariantPrice: {
                  amount: liveStatus.compareAtPrice.toString(),
                  currencyCode: product.priceRange.maxVariantPrice.currencyCode,
                },
              },
            }),
          };
        });

        setHydratedProducts(updatedProducts);
        setIsLoading(false);
      } catch (err) {
        console.error('[useLiveProductStatus] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsLoading(false);
          setHydratedProducts(currentProducts);
        }
      }
    }

    if (delay > 0) {
      timer = setTimeout(fetchLiveStatus, delay);
    } else {
      fetchLiveStatus();
    }

    return () => {
      isMounted = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [productIdsKey, options?.deferMs, options?.mode]); // Only re-fetch when product IDs or fetch mode change

  return {
    products: hydratedProducts,
    isLoading,
    error,
  };
}

