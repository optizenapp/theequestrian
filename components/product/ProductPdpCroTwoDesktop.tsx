import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductDescription } from '@/components/product/ProductDescription';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import type { ShopifyProduct } from '@/types/shopify';

interface ReviewBadgeStats {
  total_reviews: number;
  average_rating: number;
}

interface ProductPdpCroTwoDesktopProps {
  product: ShopifyProduct;
  displayTitle: string;
  descriptionHtml: string;
  topHighlights: string[];
  remainingHighlights: string[];
  reviewBadgeStats: ReviewBadgeStats | null;
  showArcEquineGelPromo?: boolean;
  styleMode?: 'cro2' | 'cro3';
}

function FeatureHighlights({ featureHighlights, columns = 1 }: { featureHighlights: string[]; columns?: 1 | 2 }) {
  if (featureHighlights.length === 0) return null;
  const listClassName = columns === 2
    ? 'grid gap-x-10 gap-y-2 md:grid-cols-2'
    : 'space-y-2';

  return (
    <div className={listClassName}>
      {featureHighlights.map((feature) => (
        <div key={feature} className="flex items-start gap-2 text-sm text-gray-700">
          <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{feature}</span>
        </div>
      ))}
    </div>
  );
}

function ArcEquinePromo() {
  return (
    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <svg className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3.5a2.5 2.5 0 01-2 2.45V16a1 1 0 01-1 1H6a1 1 0 01-1-1V8.95A2.5 2.5 0 013 6.5V3zm2 2v1.5a.5.5 0 00.5.5H9V5H5zm6 0v2h3.5a.5.5 0 00.5-.5V5h-4zM9 9H7v6h2V9zm2 0v6h2V9h-2z" />
        </svg>
        <p className="text-sm font-semibold text-green-900">Get a FREE Bonus ArcEquine Conductive Gel with every order.</p>
      </div>
    </div>
  );
}

export default function ProductPdpCroTwoDesktop({
  product,
  displayTitle,
  descriptionHtml,
  topHighlights,
  remainingHighlights,
  reviewBadgeStats,
  showArcEquineGelPromo = false,
  styleMode = 'cro2',
}: ProductPdpCroTwoDesktopProps) {
  return (
    <article aria-labelledby="pdp-product-title-desktop" className="hidden lg:block">
      <div className="space-y-8">
        {/*
          items-stretch: both columns take the height of the taller one.
          Left column:  image (natural) + description (flex-1 → fills leftover height).
          Right column: summary (natural) + buy card (flex-1 → fills leftover height).
          Works for both collapsed and expanded description states.
        */}
        <div className="grid grid-cols-12 gap-12 items-stretch">
          <div className="col-span-7 flex flex-col gap-8">
            <section aria-label="Product images">
              <ProductImageGallery images={product.images} productTitle={product.title} />
            </section>
            <div className="flex-1 flex flex-col min-h-0">
              <ProductDescription
                html={descriptionHtml}
                productTitle={displayTitle}
                collapsedHeight={520}
                className="flex-1"
                accentBorder
              />
            </div>
          </div>

          <div className="col-span-5 flex flex-col gap-6">
            <section aria-label="Product summary" className="space-y-3">
              <h1 id="pdp-product-title-desktop" className="text-3xl font-bold text-gray-900">
                {displayTitle}
              </h1>
              <ProductPageReviewBadge
                productId={product.id}
                productHandle={product.handle}
                initialStats={reviewBadgeStats}
              />
              {topHighlights.length > 0 && (
                <FeatureHighlights featureHighlights={topHighlights} />
              )}
            </section>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-black flex-1">
                <ProductBuyBox product={product} layout={styleMode === 'cro3' ? 'croTheme3' : 'croTrial'} />
              </div>
            </div>

            {remainingHighlights.length > 0 && (
              <section
                aria-label="Additional product highlights"
                className="rounded-2xl border border-black bg-surface p-6"
              >
                <FeatureHighlights featureHighlights={remainingHighlights} />
              </section>
            )}

            {showArcEquineGelPromo ? <ArcEquinePromo /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
