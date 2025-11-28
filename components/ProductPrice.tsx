'use client';

import { useEffect, useState } from 'react';

interface PriceData {
  id: string;
  availableForSale: boolean;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice: {
    amount: string;
    currencyCode: string;
  } | null;
  inStock: boolean;
  quantityAvailable: number;
}

interface ProductPriceProps {
  productId: string;
  fallbackPrice?: {
    amount: string;
    currencyCode: string;
  };
  className?: string;
}

/**
 * Client-side component that hydrates with real-time price data
 * Shows fallback price immediately, then updates with live data
 */
export function ProductPrice({ productId, fallbackPrice, className = '' }: ProductPriceProps) {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(`/api/prices?ids=${encodeURIComponent(productId)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.prices && data.prices.length > 0) {
            setPriceData(data.prices[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch price:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
  }, [productId]);

  // Show fallback price while loading
  const displayPrice = priceData?.price || fallbackPrice;
  const compareAtPrice = priceData?.compareAtPrice;

  if (!displayPrice) {
    return null;
  }

  return (
    <div className={`${className} ${isLoading ? 'opacity-70' : 'opacity-100'} transition-opacity`}>
      <div className="flex items-center gap-2">
        {compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(displayPrice.amount) && (
          <span className="text-gray-500 line-through text-sm">
            {compareAtPrice.currencyCode} {parseFloat(compareAtPrice.amount).toFixed(2)}
          </span>
        )}
        <span className="text-xl font-bold text-gray-900">
          {displayPrice.currencyCode} {parseFloat(displayPrice.amount).toFixed(2)}
        </span>
      </div>
      
      {priceData && !priceData.inStock && (
        <span className="text-sm text-red-600 mt-1 block">Out of Stock</span>
      )}
    </div>
  );
}

interface BatchProductPricesProps {
  productIds: string[];
  onPricesLoaded?: (prices: Record<string, PriceData>) => void;
}

/**
 * Batch fetch prices for multiple products
 * More efficient for collection pages with many products
 */
export function useBatchProductPrices(productIds: string[]) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchPrices = async () => {
      try {
        // Batch in chunks of 50
        const chunks: string[][] = [];
        for (let i = 0; i < productIds.length; i += 50) {
          chunks.push(productIds.slice(i, i + 50));
        }

        const allPrices: Record<string, PriceData> = {};

        await Promise.all(
          chunks.map(async (chunk) => {
            const response = await fetch(`/api/prices?ids=${chunk.map(id => encodeURIComponent(id)).join(',')}`);
            if (response.ok) {
              const data = await response.json();
              data.prices.forEach((price: PriceData) => {
                allPrices[price.id] = price;
              });
            }
          })
        );

        setPrices(allPrices);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, [productIds.join(',')]);

  return { prices, isLoading };
}

/**
 * Hydrated product card price component
 */
interface ProductCardPriceProps {
  productId: string;
  fallbackPrice?: { amount: string; currencyCode: string };
  hydratedPrice?: PriceData;
  className?: string;
}

export function ProductCardPrice({ 
  productId, 
  fallbackPrice, 
  hydratedPrice,
  className = '' 
}: ProductCardPriceProps) {
  const displayPrice = hydratedPrice?.price || fallbackPrice;
  const compareAtPrice = hydratedPrice?.compareAtPrice;

  if (!displayPrice) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-baseline gap-2">
        {compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(displayPrice.amount) && (
          <span className="text-gray-400 line-through text-sm">
            ${parseFloat(compareAtPrice.amount).toFixed(2)}
          </span>
        )}
        <span className="text-lg font-semibold text-gray-900">
          ${parseFloat(displayPrice.amount).toFixed(2)}
        </span>
      </div>
      
      {hydratedPrice && !hydratedPrice.inStock && (
        <span className="text-xs text-red-600 mt-1 block">Out of Stock</span>
      )}
    </div>
  );
}

