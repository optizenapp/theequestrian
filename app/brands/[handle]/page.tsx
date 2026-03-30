
import { notFound } from 'next/navigation';
import { getCollectionWithPagination, getCollectionProductCount } from '@/lib/shopify/collections';
import { getProductCanonicalUrls } from '@/lib/shopify/products';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getBrandContentByHandle } from '@/lib/content/brand-content';
import { RichContent } from '@/components/collection/RichContent';
import { FAQSection } from '@/components/collection/FAQSection';
import { CollectionDescription } from '@/components/CollectionDescription';
import { generateCollectionSchemaFast } from '@/lib/utils/collection-schema-fast';
import { FAQItem } from '@/lib/content/collections';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 3600;

interface BrandPageProps {
  params: Promise<{
    handle: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { handle } = await params;
  const brand = await getBrandContentByHandle(handle);

  if (!brand) {
    return {
      title: 'Brand Not Found',
    };
  }

  const title = brand.meta_title || `${brand.title} | The Equestrian`;
  const description = brand.meta_description || `Shop the full range of ${brand.title} equestrian products. Saddles, tack, clothing and more from ${brand.title}.`;
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au'}/brands/${handle}`;

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
      type: 'website',
      siteName: 'The Equestrian',
    },
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { handle } = await params;
  const { cursor } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;

  // 1. Verify Brand Exists in Mapping
  const brand = await getBrandContentByHandle(handle);
  if (!brand) {
    notFound();
  }

  // 2. Fetch Products from Shopify Collection with pagination and sorting
  const { products, pageInfo } = await getCollectionWithPagination(
    brand.handle,
    36,
    afterCursor
  );
  
  // Get total product count
  const totalProductCount = await getCollectionProductCount(brand.handle);
  
  // Generate canonical URLs for all products (fast with Neon DB)
  // Product cards will link directly to category-based URLs
  const productUrlsMap = await getProductCanonicalUrls(products);

  // Fetch review stats for all products in one batch (server-side)
  const productHandles = products.map(p => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);

  // Serialize Maps to plain objects for Client Components (Maps are not JSON-serializable in RSC)
  const productUrls = Object.fromEntries(productUrlsMap);
  const reviewStats = Object.fromEntries(reviewStatsMap);
  
  // Parse content
  const pageTitle = brand.h1_title || brand.title;
  const shortDescription = brand.short_description || `Shop our comprehensive collection of ${brand.title} products.`;
  const longDescription = brand.long_description || '';
  
  let faqItems: FAQItem[] = [];
  try {
    if (brand.faq_json) {
      faqItems = JSON.parse(brand.faq_json);
    }
  } catch (e) {
    console.warn(`Failed to parse FAQ JSON for brand ${brand.handle}`, e);
  }

  // Generate structured data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  
  // Build breadcrumbs array for schema
  const breadcrumbs = [
    { label: 'Brands', href: '/brands' },
    { label: brand.breadcrumb_label || brand.title, href: `/brands/${handle}` }
  ];

  const collectionSchema = generateCollectionSchemaFast({
    collectionName: pageTitle,
    collectionUrl: `${siteUrl}/brands/${handle}`,
    collectionDescription: brand.meta_description || `Shop premium ${brand.title} equestrian products. Official retailer with fast shipping across Australia.`,
    breadcrumbs,
    products,
    canonicalProductUrls: productUrlsMap,
    siteUrl,
    maxProducts: 12, // Limit schema to 12 products for performance
  });
  const brandEntity = {
    '@type': 'Brand',
    '@id': `${siteUrl}/brands/${handle}#brand`,
    name: brand.title,
    url: `${siteUrl}/brands/${handle}`,
    description: brand.meta_description || shortDescription,
  };
  const enhancedSchema = {
    ...collectionSchema,
    '@graph': [
      ...(Array.isArray((collectionSchema as any)['@graph']) ? (collectionSchema as any)['@graph'] : []),
      brandEntity,
    ],
  };

  return (
    <>
      {/* Structured Data - @graph with BreadcrumbList + CollectionPage + ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enhancedSchema) }}
      />

      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Breadcrumbs */}
        <nav className="container mx-auto px-4 py-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <Link href="/brands" className="hover:text-primary transition-colors">
                Brands
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium">{brand.breadcrumb_label || brand.title}</span>
            </li>
          </ol>
        </nav>

        {/* Hero Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {pageTitle}
            </h1>
            <div className="max-w-3xl">
              <CollectionDescription description={shortDescription} />
              {totalProductCount > 0 && (
                <p className="mt-4 text-sm text-gray-500">
                  Showing {totalProductCount} results
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Product Grid */}
          <ProductGridWithFilters
            products={products}
            currentCategory="brands"
            currentSubcategory={brand.handle}
            pageInfo={{
              hasNextPage: pageInfo.hasNextPage,
              endCursor: pageInfo.endCursor
            }}
            totalCount={totalProductCount}
            productUrls={productUrls}
            reviewStatsMap={reviewStats}
          />

          {/* Long Description (Rich Content) */}
          {longDescription ? (
            <RichContent html={longDescription} />
          ) : (
             /* Fallback content if no custom long description */
             <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
                <h2>About {brand.title}</h2>
                <p>Discover the premium range of <strong>{brand.title}</strong> products at The Equestrian. 
                Known for their quality and innovation, {brand.title} is a trusted name in the equestrian world.</p>
             </div>
          )}

          {/* FAQ Section */}
          {faqItems.length > 0 && (
            <FAQSection 
              faqs={faqItems}
              categoryTitle={brand.title}
            />
          )}
        </div>
      </div>
    </>
  );
}

