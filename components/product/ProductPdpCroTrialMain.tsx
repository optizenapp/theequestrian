import type { ReactNode } from 'react';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescriptionSizingTabs } from '@/components/product/ProductDescriptionSizingTabs';
import ProductIdentifierMetaRow from '@/components/product/ProductIdentifierMetaRow';
import ProductPdpStructuredDetails from '@/components/product/ProductPdpStructuredDetails';
import ProductPdpValueSummary from '@/components/product/ProductPdpValueSummary';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { StoreRatingBadge } from '@/components/reviews/StoreRatingBadge';
import { getStoreReviewStats } from '@/lib/reviews/store-stats';
import { extractCareSectionPlainText } from '@/lib/products/extract-care-from-html';
import { getProductIdentifiers } from '@/lib/products/product-identifiers';
import { buildPdpSummaryLine } from '@/lib/products/pdp-summary-line';
import { getBrandSizingForProduct } from '@/lib/sizing/resolve-brand-sizing';
import type { ProductShippingDisplay } from '@/lib/shipping/product-shipping-display';
import type { ShopifyBuyBoxProduct, ShopifyProduct } from '@/types/shopify';

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
  /** Full review block below description. */
  children: ReactNode;
  canonicalBrand?: string | null;
  brandHubHandle?: string | null;
  shippingDisplay?: ProductShippingDisplay;
  /** Optional full-width video section rendered above the review block. */
  videoSection?: ReactNode;
}

export default async function ProductPdpCroTrialMain({
  product,
  displayTitle,
  descriptionHtml,
  featureHighlights,
  reviewBadgeStats,
  children,
  canonicalBrand = null,
  brandHubHandle = null,
  shippingDisplay,
  videoSection = null,
}: ProductPdpCroTrialMainProps) {
  const storeReviewStats = await getStoreReviewStats();
  const croSummaryLine = buildPdpSummaryLine(descriptionHtml, displayTitle);
  const croCarePlain = extractCareSectionPlainText(descriptionHtml);
  const identifiers = getProductIdentifiers(product, { canonicalBrand, brandHubHandle });
  const brandSizing = await getBrandSizingForProduct({
    brandHubHandle,
    brandDisplayName: canonicalBrand,
    vendor: product.vendor,
    title: product.title,
    handle: product.handle,
    productType: product.productType,
  });
  const galleryImages = product.images.edges.map(({ node }) => node);
  const buyBoxProduct: ShopifyBuyBoxProduct = {
    id: product.id,
    title: product.title,
    vendor: product.vendor,
    productType: product.productType,
    availableForSale: product.availableForSale,
    priceRange: product.priceRange,
    compareAtPriceRange: product.compareAtPriceRange,
    variants: product.variants,
  };

  return (
    <article aria-labelledby="pdp-product-title">
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10 items-start">
        {/* Row 1 right: title + summary line + review badge */}
        <section
          className="order-1 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-1 mt-4 lg:mt-0 mb-6 lg:mb-0 space-y-4"
          aria-label="Product summary"
        >
          <h1 id="pdp-product-title" className="text-3xl font-bold text-gray-900">
            {displayTitle}
          </h1>
          <div className="hidden lg:block">
            <ProductPdpValueSummary
              summaryLine={croSummaryLine}
              bullets={featureHighlights}
              variant="summaryOnly"
            />
          </div>
          <ProductPageReviewBadge
            productId={product.id}
            productHandle={product.handle}
            initialStats={reviewBadgeStats}
          />
          <ProductIdentifierMetaRow identifiers={identifiers} />
          <StoreRatingBadge stats={storeReviewStats} />
        </section>

        {/* Left: gallery spans the hero rows on desktop */}
        <section
          className="order-2 lg:order-none lg:col-span-7 lg:row-start-1 lg:row-span-2"
          aria-label="Product images"
        >
          <ProductImageGallery images={galleryImages} productTitle={product.title} />
        </section>

        {/* Row 2 right: buy + sizing; mobile: full value summary after sizing */}
        <section
          className="order-3 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-2 mt-6 lg:mt-0 space-y-4"
          aria-label="Purchase options"
        >
          <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
            <ProductBuyBox
              product={buyBoxProduct}
              layout="croTrial"
              shippingDisplay={shippingDisplay}
              sizing={brandSizing}
            />
          </div>
          <div className="lg:hidden">
            <ProductPdpValueSummary
              summaryLine={croSummaryLine}
              bullets={featureHighlights}
              variant="full"
            />
          </div>
          <div className="hidden lg:block">
            <ProductPdpValueSummary
              summaryLine={croSummaryLine}
              bullets={featureHighlights}
              variant="bulletsOnly"
            />
          </div>
        </section>

        <div className="order-4 lg:order-none lg:col-span-12 lg:row-start-3 mt-8 lg:mt-0 min-w-0">
          <ProductPdpStructuredDetails
            vendor={product.vendor}
            productType={product.productType}
            productTitle={product.title}
            productHandle={product.handle}
            carePlainText={croCarePlain}
            sizingHref="#sizing"
          />
        </div>

        <div className="order-5 lg:order-none lg:col-span-12 lg:row-start-4 min-w-0">
          <ProductDescriptionSizingTabs
            descriptionHtml={descriptionHtml}
            productTitle={displayTitle}
            sizing={brandSizing}
          />
        </div>

        {videoSection ? (
          <div className="order-6 lg:order-none lg:col-span-12 lg:row-start-5 min-w-0">
            {videoSection}
          </div>
        ) : null}

        <div className="order-7 lg:order-none lg:col-span-12 lg:row-start-6 min-w-0">
          {children}
        </div>
      </div>
    </article>
  );
}
