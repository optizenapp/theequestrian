import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getProductByHandle, getProductCanonicalUrl, hasProductImage } from '@/lib/shopify/products';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import { getManualRedirect } from '@/lib/redirects/manual';
import { getProductOverrideByHandle, resolveProductHandleFromSlug } from '@/lib/content/product-overrides';
import ProductReviewSection from '@/components/reviews/ProductReviewSection';

export const revalidate = 300;

interface ProductCatchAllPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

/**
 * Catch-all route for product pages at any category depth
 * Handles URLs like:
 * - /clothing/footwear/boots/product-handle
 * - /horse/boots/product-handle
 * - /rider/helmets/product-handle
 * 
 * The last segment is always the product handle
 */
export default async function ProductCatchAllPage({ params }: ProductCatchAllPageProps) {
  const { slug } = await params;

  const requestedPath = `/${slug.join('/')}`;
  const manualRedirect = await getManualRedirect(requestedPath);
  if (manualRedirect) {
    if (manualRedirect.type === '301' || manualRedirect.type === '308') {
      permanentRedirect(manualRedirect.to);
    }
    redirect(manualRedirect.to);
  }
  
  // Check for legacy cart permalink URLs (should be handled by middleware but catch here as backup)
  if (slug[0] === 'cart' && slug[1] === 'c') {
    redirect('/cart');
  }
  
  // Last segment is the product handle
  const rawHandle = slug[slug.length - 1];
  const handle = await resolveProductHandleFromSlug(rawHandle);
  
  // Fetch product
  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }
  if (!hasProductImage(product)) {
    notFound();
  }
  const override = await getProductOverrideByHandle(handle);
  if (override?.is_published_headless === false) {
    notFound();
  }
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const descriptionHtml = override?.use_headless_description
    ? (override?.description_html || product.descriptionHtml)
    : product.descriptionHtml;

  // Get the canonical URL for this product
  const canonicalUrl = await getProductCanonicalUrl(product);
  
  // If the requested path doesn't match the canonical URL, redirect
  // BUT: Only if the canonical is NOT /products/{handle} (which would create a loop)
  if (requestedPath !== canonicalUrl) {
    if (canonicalUrl.startsWith('/products/')) {
      // Product has no category mapping, render it here
      // (This prevents redirect loops for unmapped products)
    } else {
      // Redirect to the correct category-based URL
      redirect(canonicalUrl);
    }
  }
  
  // If we reach here, either:
  // 1. The requested path matches the canonical URL (correct URL)
  // 2. OR the product has no category mapping (canonical is /products/{handle})

  const price = product.priceRange.minVariantPrice;
  
  // Calculate compareAtPrice from variants
  const compareAtPrice = product.variants.edges
    .map(({ node }) => node.compareAtPrice)
    .filter((cp): cp is { amount: string; currencyCode: string } => cp !== null && cp !== undefined)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
  
  // Build breadcrumb paths from product type using mapping
  const breadcrumbPaths = await getBreadcrumbsForProduct(
    product.productType || '',
    product.id
  );
  
  // Primary breadcrumb path (most specific/longest path first)
  const primaryPath = breadcrumbPaths[0] || [];
  
  // Additional paths (other categories this product appears in)
  const additionalPaths = breadcrumbPaths.slice(1, 4); // Limit to 3 additional paths
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const breadcrumbSchemas = generateBreadcrumbSchema(
    displayTitle,
    primaryPath,
    additionalPaths,
    siteUrl
  );

  // Get product-specific bullet points
  let overrideBullets: string[] = [];
  if (Array.isArray(override?.bullet_points)) {
    overrideBullets = override.bullet_points as string[];
  } else if (typeof override?.bullet_points === 'string') {
    try {
      overrideBullets = JSON.parse(override.bullet_points || '[]') as string[];
    } catch {
      overrideBullets = [];
    }
  }
  const featureHighlights = override?.use_headless_bullets && overrideBullets.length > 0
    ? overrideBullets
    : getProductBulletPoints(product.id);

  return (
    <>
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
          productTitle={displayTitle}
          primaryPath={primaryPath}
          additionalPaths={additionalPaths}
        />

        {/* Mobile title & rating (between breadcrumbs & image) */}
        <div className="lg:hidden mt-4 mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{displayTitle}</h1>
          <ProductPageReviewBadge productId={product.id} />
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
            <ProductDescription html={descriptionHtml} productTitle={displayTitle} />
          </div>

          {/* Right Column: Product Info & Buy Box (Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 lg:mb-0">
            
              {/* Title & Rating */}
              <div className="hidden lg:block">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{displayTitle}</h2>
                <div className="mb-4">
                  <ProductPageReviewBadge productId={product.id} />
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
      <ProductReviewSection
        productId={product.id}
        productHandle={product.handle}
        productTitle={product.title}
      />
    </>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: ProductCatchAllPageProps) {
  const { slug } = await params;
  const rawHandle = slug[slug.length - 1];
  const handle = await resolveProductHandleFromSlug(rawHandle);
  
  const product = await getProductByHandle(handle);
  
  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }
  if (!hasProductImage(product)) {
    return {
      title: 'Product Not Found',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const canonicalUrl = `${siteUrl}${await getProductCanonicalUrl(product)}`;
  
  const override = await getProductOverrideByHandle(handle);
  if (override?.is_published_headless === false) {
    return {
      title: 'Product Not Found',
    };
  }
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const title = override?.use_headless_meta_title
    ? (override?.meta_title || `${displayTitle} | The Equestrian`)
    : `${displayTitle} | The Equestrian`;
  const description =
    override?.use_headless_meta_description
      ? (override?.meta_description || product.description || `Shop ${displayTitle} at The Equestrian. Quality equestrian supplies and equipment.`)
      : (product.description || `Shop ${displayTitle} at The Equestrian. Quality equestrian supplies and equipment.`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'The Equestrian',
      type: 'website',
      images: product.images.edges[0]?.node ? [
        {
          url: product.images.edges[0].node.url,
          width: product.images.edges[0].node.width || 1200,
          height: product.images.edges[0].node.height || 1200,
          alt: product.images.edges[0].node.altText || displayTitle,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.images.edges[0]?.node ? [product.images.edges[0].node.url] : [],
    },
  };
}

