import Link from 'next/link';
import { getSizingUrl } from '@/lib/sizing/sizing-config';

interface SizingGuideLinkProps {
  vendor: string | null | undefined;
  productType: string | null | undefined;
  productTitle?: string | null | undefined;
  productHandle?: string | null | undefined;
  /** Tighter block for use beside the buy box (CRO PDP trial). */
  variant?: 'default' | 'compact';
}

/**
 * Smart sizing guide link component
 * 
 * Displays a link to sizing charts based on product vendor and type.
 * Only shows for products that require sizing (apparel, footwear, helmets, etc.)
 */
export function SizingGuideLink({
  vendor,
  productType,
  productTitle,
  productHandle,
  variant = 'default',
}: SizingGuideLinkProps) {
  // Get the appropriate sizing URL
  const specificSizingUrl = getSizingUrl({
    vendor,
    productType,
    title: productTitle,
    handle: productHandle,
  });

  // Default to main sizing page if no specific brand match found
  // User requested link on ALL product pages as fallback
  const finalUrl = specificSizingUrl || '/sizing';
  const label = specificSizingUrl ? 'View Sizing Guide' : 'View Size Charts';
  const description = specificSizingUrl 
    ? 'View our detailed sizing charts to find your perfect fit.'
    : 'Find the perfect fit with our comprehensive sizing guides.';

  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
        <h3 className="text-base font-bold text-gray-900 mb-1">Need help with sizing?</h3>
        <p className="text-sm text-gray-600 mb-3">
          {description} Exchanges for size are subject to our returns policy.
        </p>
        <Link
          href={finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
        >
          {label}
          <span aria-hidden>↗</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 my-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-blue-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Need Help with Sizing?
          </h3>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>

        {/* CTA Button */}
        <Link
          href={finalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          {label}
          <svg 
            className="w-5 h-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5l7 7-7 7" 
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}


