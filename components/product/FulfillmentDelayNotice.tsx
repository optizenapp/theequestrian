import { EE_FULFILLMENT_DELAY_MESSAGE } from '@/lib/shipping/exclusively-equine-fulfillment-delay';

type FulfillmentDelayNoticeVariant = 'banner' | 'cta';

interface FulfillmentDelayNoticeProps {
  variant?: FulfillmentDelayNoticeVariant;
  className?: string;
}

/**
 * Temporary Exclusively Equine fulfillment delay notice.
 * `banner` = page-level alert; `cta` = standout note near Add to Cart / Buy Now.
 */
export function FulfillmentDelayNotice({
  variant = 'banner',
  className = '',
}: FulfillmentDelayNoticeProps) {
  if (variant === 'cta') {
    return (
      <div
        role="status"
        className={`rounded-lg border-2 border-amber-500 bg-amber-100 px-4 py-3 ${className}`.trim()}
      >
        <p className="text-sm font-semibold leading-snug text-amber-950">
          {EE_FULFILLMENT_DELAY_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 ${className}`.trim()}
    >
      <p className="text-sm font-medium leading-relaxed text-amber-950 sm:text-base">
        {EE_FULFILLMENT_DELAY_MESSAGE}
      </p>
    </div>
  );
}
