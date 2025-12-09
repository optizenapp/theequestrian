import { notFound } from 'next/navigation';
import { getProductByHandle } from '@/lib/shopify/products';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{
    handle: string;
  }>;
}

const featureHighlights = [
  'Premium quality materials for long-lasting durability and comfort',
  'Expertly designed for optimal performance in all conditions',
  'Trusted by professionals and enthusiasts worldwide',
];

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
  
  // Build breadcrumb paths from product type using mapping
  const breadcrumbPaths = product.productType 
    ? getBreadcrumbsForProduct(product.productType)
    : [];
  
  // Primary breadcrumb path (most specific/longest path first)
  const primaryPath = breadcrumbPaths[0] || [];
  
  // Additional paths (other categories this product appears in)
  const additionalPaths = breadcrumbPaths.slice(1, 4); // Limit to 3 additional paths
  
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

        {/* Mobile title & rating (between breadcrumbs & image) */}
        <div className="lg:hidden mt-4 mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex text-yellow-400">★★★★☆</div>
            <span className="text-gray-500 hover:underline cursor-pointer">
              4.5 (128 reviews)
            </span>
          </div>
          <div className="space-y-2 mt-4">
            {featureHighlights.map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
          {/* Left Column: Image Gallery & Description */}
          <div className="lg:col-span-7 space-y-8">
            {/* Image Gallery */}
            <ProductImageGallery 
              images={product.images}
              productTitle={product.title}
            />

            {/* Full Width Description Section */}
            <ProductDescription html={product.descriptionHtml} productTitle={product.title} />
          </div>

          {/* Right Column: Product Info & Buy Box (Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 lg:mb-0">
            
              {/* Title & Rating */}
              <div className="hidden lg:block">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h2>
                <div className="flex items-center gap-2 text-sm mb-4">
                  <div className="flex text-yellow-400">★★★★☆</div>
                  <span className="text-gray-500 hover:underline cursor-pointer">
                    4.5 (128 reviews)
                  </span>
                </div>

                {/* Key Features/Benefits */}
                <div className="space-y-2 mt-4">
                  {featureHighlights.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buy Box */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
                <ProductBuyBox product={product} />
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
