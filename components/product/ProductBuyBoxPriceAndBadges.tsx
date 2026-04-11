'use client';

interface ProductBuyBoxPriceAndBadgesProps {
  priceNum: number;
  compareAmount: string | null;
  onSale: boolean;
  saveAmount: number;
  savePercent: number | null;
  layout: 'default' | 'croTrial' | 'croTheme3';
}

export function ProductBuyBoxPriceAndBadges({
  priceNum,
  compareAmount,
  onSale,
  saveAmount,
  savePercent,
  layout,
}: ProductBuyBoxPriceAndBadgesProps) {
  const isCroTrial = layout === 'croTrial';
  const isCroTheme3 = layout === 'croTheme3';
  const highlightedPriceClass = isCroTheme3
    ? 'inline-flex items-center justify-center rounded-[12px] px-5 py-1.5 text-4xl font-extrabold text-white'
    : isCroTrial
    ? 'inline-flex items-center justify-center rounded-sm border-2 px-5 py-1.5 text-4xl font-extrabold text-white shadow-[2px_2px_0_#0B0B0B]'
    : 'text-4xl font-bold text-gray-900';

  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        <span
          className={highlightedPriceClass}
          style={
            isCroTheme3
              ? { backgroundColor: '#0B1020' }
              : isCroTrial
              ? { backgroundColor: '#0EA5A4', borderColor: '#0B0B0B' }
              : undefined
          }
        >
          ${priceNum.toFixed(2)}
        </span>
        {compareAmount && onSale ? (
          <span
            className="text-lg line-through font-medium"
            style={isCroTheme3 ? { color: '#B9B9B9' } : undefined}
          >
            ${parseFloat(compareAmount).toFixed(2)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {onSale ? (
          <span
            className="inline-block px-3 py-1.5 text-sm font-semibold"
            style={
              isCroTheme3
                ? { backgroundColor: '#DDF7E8', color: '#116149', borderRadius: '999px' }
                : { backgroundColor: '#94F5BD', color: '#111827', borderRadius: '0.375rem' }
            }
          >
            Save ${saveAmount.toFixed(2)}
            {savePercent !== null && savePercent > 0 ? ` (${savePercent}% off)` : ''}
          </span>
        ) : null}

        <span
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: isCroTheme3 ? '#2563EB' : '#155dfb' }}
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
          </svg>
          FREE SHIPPING
        </span>
      </div>
    </div>
  );
}
