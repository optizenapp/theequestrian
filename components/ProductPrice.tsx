'use client';

interface PriceValue {
  amount: string;
  currencyCode: string;
}

interface ProductPriceProps {
  price: PriceValue;
  compareAtPrice?: PriceValue | null;
  currencyCode?: string; // Optional, can be derived from price
  className?: string;
  // Legacy props (no longer used - prices already include shipping from Shopify)
  vendor?: string;
  tags?: string[];
  weight?: {
    value: number;
    unit: string;
  };
  includeShipping?: boolean; // Default: true
}

/**
 * Product Price Component
 * Renders a price with currency formatting and optional compare-at price
 * 
 * NOTE: Prices from Shopify already include shipping offset (updated by bulk script/webhooks)
 * No need to calculate shipping on the frontend anymore!
 */
export function ProductPrice({ 
  price, 
  compareAtPrice, 
  className = '',
  includeShipping = true,
}: ProductPriceProps) {
  if (!price) return null;

  // Prices already include shipping from Shopify (no calculation needed)
  const displayPrice = price;
  const displayCompareAtPrice = compareAtPrice;

  const hasDiscount = displayCompareAtPrice && parseFloat(displayCompareAtPrice.amount) > parseFloat(displayPrice.amount);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Compare At Price (Strikethrough) */}
      {hasDiscount && (
        <span className="text-sm text-gray-500 line-through decoration-gray-400 mb-0.5">
          ${parseFloat(displayCompareAtPrice.amount).toFixed(2)}
        </span>
      )}

      {/* Current Price - Always black */}
      <span className="font-bold text-gray-900 text-lg">
        ${parseFloat(displayPrice.amount).toFixed(2)}
      </span>

      {/* Badges Row - Save Amount + FREE SHIPPING (inline) */}
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        {/* Save Amount Badge - First */}
        {hasDiscount && (
          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-gray-900" style={{ backgroundColor: '#94F5BD' }}>
            Save ${(parseFloat(displayCompareAtPrice.amount) - parseFloat(displayPrice.amount)).toFixed(2)}
          </span>
        )}
        
        {/* FREE SHIPPING Badge - Second */}
        {includeShipping && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: '#155dfb' }}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
            </svg>
            FREE SHIPPING
          </span>
        )}
      </div>
    </div>
  );
}
