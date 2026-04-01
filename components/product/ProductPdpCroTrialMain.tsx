import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { SizingGuideLink } from '@/components/product/SizingGuideLink';
import ProductPdpStructuredDetails from '@/components/product/ProductPdpStructuredDetails';
import ProductPdpValueSummary from '@/components/product/ProductPdpValueSummary';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { extractCareSectionPlainText } from '@/lib/products/extract-care-from-html';
import { buildPdpSummaryLine } from '@/lib/products/pdp-summary-line';
import type { ShopifyProduct } from '@/types/shopify';

interface ReviewBadgeStats {
  total_reviews: number;
  average_rating: number;
}

interface ProductPdpCroTrialMainProps {
  product: ShopifyProduct;
  displayTitle: string;
  descriptionHtml: string;
  featureHighlights: string[];
  reviewBadgeStats: ReviewBadgeStats | null;
}

export default function ProductPdpCroTrialMain({
  product,
  displayTitle,
  descriptionHtml,
  featureHighlights,
  reviewBadgeStats,
}: ProductPdpCroTrialMainProps) {
  const croSummaryLine = buildPdpSummaryLine(descriptionHtml, displayTitle);
  const croCarePlain = extractCareSectionPlainText(descriptionHtml);

  return (
    <article aria-labelledby="pdp-product-title">
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-12 items-start">
        <section
          className="order-1 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-1 mt-4 lg:mt-0 mb-6 lg:mb-0 space-y-4"
          aria-label="Product summary"
        >
          <h1 id="pdp-product-title" className="text-3xl font-bold text-gray-900">
            {displayTitle}
          </h1>
          <ProductPageReviewBadge
            productId={product.id}
            productHandle={product.handle}
            initialStats={reviewBadgeStats}
          />
        </section>

        <section
          className="order-2 lg:order-none lg:col-span-7 lg:row-start-1 lg:row-span-2"
          aria-label="Product images"
        >
          <ProductImageGallery images={product.images} productTitle={product.title} />
        </section>

        <section
          className="order-3 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:sticky lg:top-24 lg:self-start lg:z-10 space-y-4 mt-6 lg:mt-0"
          aria-label="Purchase options"
        >
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
            <ProductBuyBox product={product} layout="croTrial" />
          </div>
          <SizingGuideLink
            vendor={product.vendor}
            productType={product.productType}
            productTitle={product.title}
            productHandle={product.handle}
            variant="compact"
          />
          <ProductPdpValueSummary summaryLine={croSummaryLine} bullets={featureHighlights} />
        </section>
      </div>

      <div className="mt-10 space-y-10">
        <ProductPdpStructuredDetails
          vendor={product.vendor}
          productType={product.productType}
          productTitle={product.title}
          productHandle={product.handle}
          carePlainText={croCarePlain}
        />
        <ProductDescription html={descriptionHtml} productTitle={displayTitle} />
      </div>
    </article>
  );
}
