import type { ReactNode } from 'react';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescriptionSizingTabs } from '@/components/product/ProductDescriptionSizingTabs';
import ProductIdentifierMetaRow from '@/components/product/ProductIdentifierMetaRow';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { StoreRatingBadge } from '@/components/reviews/StoreRatingBadge';
import { getStoreReviewStats } from '@/lib/reviews/store-stats';
import { getProductIdentifiers } from '@/lib/products/product-identifiers';
import { getBrandSizingForProduct } from '@/lib/sizing/resolve-brand-sizing';
import type { ProductShippingDisplay } from '@/lib/shipping/product-shipping-display';
import type { ShopifyBuyBoxProduct, ShopifyProduct } from '@/types/shopify';

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
  canonicalBrand?: string | null;
  brandHubHandle?: string | null;
  shippingDisplay?: ProductShippingDisplay;
}

function ArcEquinePromo() {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
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

export default async function ProductPdpCroTwoMain({
  product,
  displayTitle,
  descriptionHtml,
  featureHighlights,
  reviewBadgeStats,
  showArcEquineGelPromo = false,
  afterDescription,
  styleMode = 'cro2',
  canonicalBrand = null,
  brandHubHandle = null,
  shippingDisplay,
}: ProductPdpCroTwoMainProps) {
  const storeReviewStats = await getStoreReviewStats();
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

  /*
   * Mobile: single flex-col, children ordered via order-N classes.
   *         Column wrappers use display:contents so their children
   *         become direct flex children of the outer container.
   *
   * Desktop (lg): outer becomes a 12-col grid with items-stretch.
   *         Column wrappers become actual flex-col grid items, each
   *         stretching to the same total height. Left col: image then
   *         description (description flex-1 → fills remaining height,
   *         Read More if overflowing). Right col: summary, buy box
   *         (flex-1 → fills remaining height).
   */
  return (
    <>
      <article aria-labelledby="pdp-product-title">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-x-12 lg:gap-y-0">

          {/* Left column: image + description */}
          <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-8">
            <section className="order-2 lg:order-none" aria-label="Product images">
              <ProductImageGallery images={galleryImages} productTitle={product.title} />
            </section>

            <section
              className="order-4 lg:order-none lg:flex-1 lg:min-h-0 lg:flex lg:flex-col"
              aria-label="Product description"
            >
              <ProductDescriptionSizingTabs
                descriptionHtml={descriptionHtml}
                productTitle={displayTitle}
                sizing={brandSizing}
                specifications={featureHighlights}
                collapsedHeight={360}
                accentBorder
                fillHeight
                className="border border-black"
              />
            </section>
          </div>

          {/* Right column: summary + buy box (flex-1) */}
          <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-6">
            <section
              className="order-1 mt-4 space-y-2 lg:order-none lg:mt-0"
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
              <ProductIdentifierMetaRow identifiers={identifiers} />
              <StoreRatingBadge stats={storeReviewStats} />
            </section>

            <section
              className="order-3 lg:order-none lg:flex-1 lg:min-h-0 lg:flex lg:flex-col"
              aria-label="Purchase options"
            >
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-black lg:flex-1">
                <ProductBuyBox
                  product={buyBoxProduct}
                  layout={styleMode === 'cro3' ? 'croTheme3' : 'croTrial'}
                  shippingDisplay={shippingDisplay}
                  sizing={brandSizing}
                />
              </div>
            </section>

            {showArcEquineGelPromo ? (
              <section
                className="order-5 space-y-4 lg:order-none lg:flex-shrink-0"
                aria-label="Additional product highlights"
              >
                <ArcEquinePromo />
              </section>
            ) : null}
          </div>

        </div>
      </article>
      {afterDescription}
    </>
  );
}
