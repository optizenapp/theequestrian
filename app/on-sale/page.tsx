
import { notFound } from 'next/navigation';
import { getCollectionWithPagination } from '@/lib/shopify/collections';
import { getProductCanonicalUrls } from '@/lib/shopify/products';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getSalePageByPath } from '@/lib/mapping/sale-mapping';
import { RichContent } from '@/components/collection/RichContent';
import { FAQSection } from '@/components/collection/FAQSection';
import { CollectionDescription } from '@/components/CollectionDescription';
import { HeroImageLeftWaveFrame } from '@/components/collection/HeroWaveEdge';
import { generateCollectionSchemaFast } from '@/lib/utils/collection-schema-fast';
import { FAQItem } from '@/lib/content/collections';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

const ON_SALE_HERO_IMAGE = '/hero-good-deals.png';
const ON_SALE_HERO_ALT =
  'Horse wearing a premium navy equestrian rug — shop Good Deals at The Equestrian';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const pageData = getSalePageByPath('/on-sale');
  
  // Default values if CSV is missing or empty
  const title = pageData?.meta_title || 'On Sale | The Equestrian';
  const description = pageData?.meta_description || 'Shop our best deals and clearance items at The Equestrian.';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(
    /\/$/,
    ''
  );
  const canonicalUrl = `${siteUrl}/on-sale`;

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
      images: [{ url: `${siteUrl}${ON_SALE_HERO_IMAGE}`, alt: ON_SALE_HERO_ALT }],
    },
  };
}

export default async function OnSalePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const afterCursor = typeof params.cursor === 'string' ? params.cursor : null;
  const saleCategory =
    typeof params.saleCategory === 'string' ? params.saleCategory : undefined;

  // 1. Get Page Configuration from CSV
  const pageData = getSalePageByPath('/on-sale');
  const collectionHandle = pageData?.handle || 'on-sale';

  // 2. Fetch products; keep only real compare-at discounts (Collective often sets compare === price).
  // Category facets + optional saleCategory filter run on the full sale set before paging.
  const { products, pageInfo, totalCount, onSaleCategoryOptions } =
    await getCollectionWithPagination(collectionHandle, 36, afterCursor, {
      requireRealDiscount: true,
      maxProducts: 2000,
      includeOnSaleCategoryFacets: true,
      saleCategory,
    });
  
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
  const pageTitle = pageData?.h1_title || 'Good Deals';
  const shortDescription = pageData?.short_description || 'Browse our selection of discounted products.';
  const longDescription = pageData?.long_description || '';
  
  let faqItems: FAQItem[] = [];
  try {
    if (pageData?.faq_json) {
      faqItems = JSON.parse(pageData.faq_json);
    }
  } catch (e) {
    console.warn(`Failed to parse FAQ JSON for sale page`, e);
  }

  // Generate structured data
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  
  // Build breadcrumbs array for schema
  const breadcrumbs = [
    { label: pageData?.breadcrumb_label || "Good Deals", href: '/on-sale' }
  ];

  const collectionSchema = generateCollectionSchemaFast({
    collectionName: pageTitle,
    collectionUrl: `${siteUrl}/on-sale`,
    collectionDescription: pageData?.meta_description || 'Shop premium equestrian products on sale. Quality items at discounted prices with fast shipping across Australia.',
    breadcrumbs,
    products,
    canonicalProductUrls: productUrlsMap,
    siteUrl,
    maxProducts: 12, // Limit schema to 12 products for performance
  });

  return (
    <>
      {/* Structured Data - @graph with BreadcrumbList + CollectionPage + ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
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
              <span className="text-gray-900 font-medium">{pageData?.breadcrumb_label || "Good Deals"}</span>
            </li>
          </ol>
        </nav>

        {/* Hero Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-8 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-6 lg:gap-8">
              <div className="min-w-0 shrink-0 md:w-[38%] md:max-w-lg">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 md:mb-5">
                  {pageTitle}
                </h1>
                <CollectionDescription description={shortDescription} />
                {totalCount > 0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    {totalCount} {totalCount === 1 ? 'deal' : 'deals'} live now
                  </p>
                )}
              </div>
              <div className="h-40 w-full flex-1 overflow-hidden rounded-r-xl sm:h-44 md:h-[11.5rem] lg:h-[12.5rem]">
                <HeroImageLeftWaveFrame className="h-full w-full">
                  <div className="relative h-full w-full bg-gray-100">
                    <Image
                      src={ON_SALE_HERO_IMAGE}
                      alt={ON_SALE_HERO_ALT}
                      fill
                      className="object-cover object-center"
                      sizes="(max-width: 768px) 100vw, 60vw"
                      priority
                    />
                  </div>
                </HeroImageLeftWaveFrame>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Product Grid */}
          <ProductGridWithFilters
            products={products}
            currentCategory="on-sale" // Special identifier for sale page
            currentSubcategory=""
            pageInfo={{
              hasNextPage: pageInfo.hasNextPage,
              endCursor: pageInfo.endCursor
            }}
            totalCount={totalCount}
            productUrls={productUrls}
            reviewStatsMap={reviewStats}
            onSaleCategoryOptions={onSaleCategoryOptions}
          />

          {/* Long Description (Rich Content) */}
          {longDescription && (
            <RichContent html={longDescription} />
          )}

          {/* FAQ Section */}
          {faqItems.length > 0 && (
            <FAQSection 
              faqs={faqItems}
              categoryTitle={pageTitle}
            />
          )}
        </div>
      </div>
    </>
  );
}

