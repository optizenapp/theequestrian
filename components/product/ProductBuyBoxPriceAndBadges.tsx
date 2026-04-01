'use client';

interface ProductBuyBoxPriceAndBadgesProps {
  priceNum: number;
  compareAmount: string | null;
  onSale: boolean;
  saveAmount: number;
  savePercent: number | null;
  isCro: boolean;
}

export function ProductBuyBoxPriceAndBadges({
  priceNum,
  compareAmount,
  onSale,
  saveAmount,
  savePercent,
  isCro,
}: ProductBuyBoxPriceAndBadgesProps) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span className="text-4xl font-bold text-gray-900">${priceNum.toFixed(2)}</span>
        {compareAmount && onSale ? (
          <span className="text-lg text-gray-400 line-through font-medium">
            ${parseFloat(compareAmount).toFixed(2)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {onSale ? (
          <span
            className="inline-block px-3 py-1.5 rounded-md text-sm font-semibold text-gray-900"
            style={{ backgroundColor: '#94F5BD' }}
          >
            Save ${saveAmount.toFixed(2)}
            {savePercent !== null && savePercent > 0 ? ` (${savePercent}% off)` : ''}
          </span>
        ) : null}

        <span
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: '#155dfb' }}
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
          </svg>
          {isCro ? 'Shipping included in price shown' : 'FREE SHIPPING'}
        </span>
      </div>
    </div>
  );
}
