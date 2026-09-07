import {
  EE_FULFILLMENT_DELAY_BRAND_MESSAGE,
  EE_FULFILLMENT_DELAY_MESSAGE,
} from '@/lib/shipping/exclusively-equine-fulfillment-delay';

type FulfillmentDelayNoticeVariant = 'banner' | 'cta';
type FulfillmentDelayNoticeScope = 'product' | 'brand';

interface FulfillmentDelayNoticeProps {
  variant?: FulfillmentDelayNoticeVariant;
  /** Brand hub uses brand-scoped copy; PDPs default to product copy. */
  scope?: FulfillmentDelayNoticeScope;
  className?: string;
}

/**
 * Temporary Exclusively Equine fulfillment delay notice.
 * `banner` = page-level alert; `cta` = standout note near Add to Cart / Buy Now.
 */
export function FulfillmentDelayNotice({
  variant = 'banner',
  scope = 'product',
  className = '',
}: FulfillmentDelayNoticeProps) {
  const message =
    scope === 'brand' ? EE_FULFILLMENT_DELAY_BRAND_MESSAGE : EE_FULFILLMENT_DELAY_MESSAGE;

  if (variant === 'cta') {
    return (
      <div
        role="status"
        className={`rounded-lg border-2 border-amber-500 bg-amber-100 px-4 py-3 ${className}`.trim()}
      >
        <p className="text-sm font-semibold leading-snug text-amber-950">{message}</p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`rounded-lg border border-amber-400 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 ${className}`.trim()}
    >
      <p className="text-sm font-medium leading-relaxed text-amber-950 sm:text-base">{message}</p>
    </div>
  );
}
