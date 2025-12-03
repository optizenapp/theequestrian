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
    <div className={`flex items-baseline gap-2 ${className}`}>
      {/* Current Price */}
      <span className="text-lg font-bold text-gray-900">
        {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
      </span>

      {/* Compare At Price (Strikethrough) */}
      {hasDiscount && (
        <span className="text-sm text-gray-500 line-through decoration-gray-400">
          {compareAtPrice.currencyCode} {parseFloat(compareAtPrice.amount).toFixed(2)}
        </span>
      )}
    </div>
  );
}
