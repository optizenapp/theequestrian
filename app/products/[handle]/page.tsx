import { notFound } from 'next/navigation';
import { getProductByHandle } from '@/lib/shopify/products';
import Link from 'next/link';
import { ProductPrice } from '@/components/ProductPrice';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductVariantSelector } from '@/components/ProductVariantSelector';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{
    handle: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }

  const price = product.priceRange.minVariantPrice;
  
  // Calculate compareAtPrice from variants
  const compareAtPrice = product.variants.edges
    .map(({ node }) => node.compareAtPrice)
    .filter((cp): cp is { amount: string; currencyCode: string } => cp !== null && cp !== undefined)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
  
  // Build breadcrumb paths from collections
  const primaryCollection = (product as any).primaryCollection;
  const allCollections = product.collections.edges.map(({ node }) => node);
  
  // Primary breadcrumb path
  const primaryPath = primaryCollection 
    ? primaryCollection.split('/').map((segment: string, index: number, arr: string[]) => ({
        label: segment.replace(/-/g, ' '),
        href: `/${arr.slice(0, index + 1).join('/')}`
      }))
    : [];
  
  // Additional paths from other collections (excluding primary)
  const additionalPaths = allCollections
    .filter(collection => {
      // Exclude the primary collection
      if (primaryCollection) {
        const primaryHandle = primaryCollection.split('/').pop();
        return collection.handle !== primaryHandle;
      }
      return true;
    })
    .slice(0, 3) // Limit to 3 additional paths
    .map(collection => [{
      label: collection.title,
      href: `/${collection.handle}`
    }]);
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const breadcrumbSchemas = generateBreadcrumbSchema(
    product.title,
    primaryPath,
    additionalPaths,
    siteUrl
  );

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Breadcrumb Schema */}
      {Array.isArray(breadcrumbSchemas) ? (
        breadcrumbSchemas.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))
      ) : (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchemas) }}
        />
      )}

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-4">
        
        {/* Breadcrumb */}
        <ProductBreadcrumbs
          productTitle={product.title}
          primaryPath={primaryPath}
          additionalPaths={additionalPaths}
        />

        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Image Gallery & Description */}
          <div className="lg:col-span-7 space-y-8">
            {/* Image Gallery */}
            <ProductImageGallery 
              images={product.images}
              productTitle={product.title}
            />

            {/* Full Width Description Section */}
            <div className="bg-surface rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Description</h2>
              <div className="prose prose-gray max-w-none">
                <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
              </div>
            </div>
          </div>

          {/* Right Column: Product Info & Buy Box (Sticky) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6 mb-8 lg:mb-0">
              
              {/* Title & Rating */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                <div className="flex items-center gap-2 text-sm mb-4">
                  <div className="flex text-yellow-400">★★★★☆</div>
                  <span className="text-gray-500 hover:underline cursor-pointer">
                    4.5 (128 reviews)
                  </span>
                </div>

                {/* Key Features/Benefits */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Premium quality materials for long-lasting durability and comfort</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Expertly designed for optimal performance in all conditions</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Trusted by professionals and enthusiasts worldwide</span>
                  </div>
                </div>
              </div>

              {/* Variant Selector */}
              <ProductVariantSelector variants={product.variants.edges} />

              {/* Price & Action */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ${parseFloat(price.amount).toFixed(2)}
                    </span>
                    {compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount) && (
                      <span className="text-lg text-gray-400 line-through font-medium">
                        ${parseFloat(compareAtPrice.amount).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount) && (
                    <div className="inline-block">
                      <span className="px-3 py-1 rounded-md text-sm font-semibold text-gray-900" style={{ backgroundColor: '#94F5BD' }}>
                        Save ${(parseFloat(compareAtPrice.amount) - parseFloat(price.amount)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <button 
                  disabled={!product.availableForSale}
                  className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {product.availableForSale ? 'Add to Cart' : 'Out of Stock'}
                </button>

                {/* Trust Signals */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>Free standard shipping</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>12-month warranty included</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span>30-day money-back guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
