import type { ReactNode } from 'react';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import ProductIdentifierMetaRow from '@/components/product/ProductIdentifierMetaRow';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { getProductIdentifiers } from '@/lib/products/product-identifiers';
import ProductPdpCroTwoDesktop from '@/components/product/ProductPdpCroTwoDesktop';
import type { ShopifyProduct } from '@/types/shopify';

interface ReviewBadgeStats {
  total_reviews: number;
  average_rating: number;
}

interface ProductPdpCroTwoMainProps {
  product: ShopifyProduct;
  displayTitle: string;
  descriptionHtml: string;
  featureHighlights: string[];
  reviewBadgeStats: ReviewBadgeStats | null;
  showArcEquineGelPromo?: boolean;
  afterDescription?: ReactNode;
  styleMode?: 'cro2' | 'cro3';
}

function FeatureHighlights({
  featureHighlights,
  columns = 1,
}: {
  featureHighlights: string[];
  columns?: 1 | 2;
}) {
  const listClassName =
    columns === 2
      ? 'mt-4 grid gap-x-10 gap-y-2 md:grid-cols-2'
      : 'space-y-2 mt-4';

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

function splitFeatureHighlights(featureHighlights: string[]) {
  return {
    topHighlights: featureHighlights.slice(0, 3),
    remainingHighlights: featureHighlights.slice(3),
  };
}

function ArcEquinePromo() {
  return (
    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <svg className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3.5a2.5 2.5 0 01-2 2.45V16a1 1 0 01-1 1H6a1 1 0 01-1-1V8.95A2.5 2.5 0 013 6.5V3zm2 2v1.5a.5.5 0 00.5.5H9V5H5zm6 0v2h3.5a.5.5 0 00.5-.5V5h-4zM9 9H7v6h2V9zm2 0v6h2V9h-2z" />
        </svg>
        <p className="text-sm font-semibold text-green-900">
          Get a FREE Bonus ArcEquine Conductive Gel with every order.
        </p>
      </div>
    </div>
  );
}

export default function ProductPdpCroTwoMain({
  product,
  displayTitle,
  descriptionHtml,
  featureHighlights,
  reviewBadgeStats,
  showArcEquineGelPromo = false,
  afterDescription,
  styleMode = 'cro2',
}: ProductPdpCroTwoMainProps) {
  const { topHighlights, remainingHighlights } = splitFeatureHighlights(featureHighlights);
  const identifiers = getProductIdentifiers(product);

  return (
    <>
      <article aria-labelledby="pdp-product-title-mobile" className="lg:hidden">
        <div className="grid grid-cols-1 items-start">
          <section
            className="order-1 mt-4 mb-6 space-y-2"
            aria-label="Product summary"
          >
            <h1 id="pdp-product-title-mobile" className="text-3xl font-bold text-gray-900">
              {displayTitle}
            </h1>
            <ProductPageReviewBadge
              productId={product.id}
              productHandle={product.handle}
              initialStats={reviewBadgeStats}
            />
            <ProductIdentifierMetaRow identifiers={identifiers} />
            <FeatureHighlights featureHighlights={topHighlights} />
          </section>

          <section className="order-2" aria-label="Product images">
            <ProductImageGallery images={product.images} productTitle={product.title} />
          </section>

          <section
            className="order-3 mt-6"
            aria-label="Purchase options"
          >
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-black">
              <ProductBuyBox product={product} layout={styleMode === 'cro3' ? 'croTheme3' : 'croTrial'} />
            </div>
          </section>

          <section
            className="order-4 space-y-8 mt-8"
            aria-label="Product description"
          >
            <ProductDescription
              html={descriptionHtml}
              productTitle={displayTitle}
              collapsedHeight={520}
              accentBorder
            />
          </section>

          <section className="order-5" aria-label="Additional product highlights">
            {remainingHighlights.length > 0 && (
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-black">
                <FeatureHighlights featureHighlights={remainingHighlights} />
              </div>
            )}
            {showArcEquineGelPromo ? <ArcEquinePromo /> : null}
          </section>
        </div>
      </article>

      <ProductPdpCroTwoDesktop
        product={product}
        displayTitle={displayTitle}
        descriptionHtml={descriptionHtml}
        topHighlights={topHighlights}
        remainingHighlights={remainingHighlights}
        reviewBadgeStats={reviewBadgeStats}
        showArcEquineGelPromo={showArcEquineGelPromo}
        styleMode={styleMode}
        identifiers={identifiers}
      />
      {afterDescription}
    </>
  );
}
