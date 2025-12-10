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
}

/**
 * Product Price Component
 * Renders a price with currency formatting and optional compare-at price
 */
export function ProductPrice({ 
  price, 
  compareAtPrice, 
  className = '' 
}: ProductPriceProps) {
  if (!price) return null;

  const hasDiscount = compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Compare At Price (Strikethrough) */}
      {hasDiscount && (
        <span className="text-sm text-gray-500 line-through decoration-gray-400 mb-0.5">
          ${parseFloat(compareAtPrice.amount).toFixed(2)}
        </span>
      )}

      {/* Current Price - Always black */}
      <span className="font-bold text-gray-900 text-lg">
        ${parseFloat(price.amount).toFixed(2)}
      </span>

      {/* Save Amount - Green Badge */}
      {hasDiscount && (
        <div className="inline-block mt-1">
          <span className="px-2 py-0.5 rounded text-xs font-semibold text-gray-900" style={{ backgroundColor: '#94F5BD' }}>
            Save ${(parseFloat(compareAtPrice.amount) - parseFloat(price.amount)).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
