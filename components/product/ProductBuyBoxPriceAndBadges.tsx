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

      {onSale ? (
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      ) : null}
    </div>
  );
}
