
import { notFound } from 'next/navigation';
import { getCollectionWithPagination } from '@/lib/shopify/collections';
import { getProductCanonicalUrls } from '@/lib/shopify/products';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getSalePageByPath } from '@/lib/mapping/sale-mapping';
import { RichContent } from '@/components/collection/RichContent';
import { FAQSection } from '@/components/collection/FAQSection';
import { CollectionDescription } from '@/components/CollectionDescription';
import { generateCollectionSchemaFast } from '@/lib/utils/collection-schema-fast';
import { FAQItem } from '@/lib/content/collections';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata(): Promise<Metadata> {
  const pageData = getSalePageByPath('/on-sale');
  
  // Default values if CSV is missing or empty
  const title = pageData?.meta_title || 'On Sale | The Equestrian';
  const description = pageData?.meta_description || 'Shop our best deals and clearance items at The Equestrian.';
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au'}/on-sale`;

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

export default async function OnSalePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { cursor } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;

  // 1. Get Page Configuration from CSV
  const pageData = getSalePageByPath('/on-sale');
  const collectionHandle = pageData?.handle || 'on-sale';

  // 2. Fetch Products from Shopify Collection with pagination and sorting
  const { collection, products, pageInfo, totalCount } = await getCollectionWithPagination(
    collectionHandle,
    36,
    afterCursor
  );
  
  // Generate canonical URLs for all products (fast with Neon DB)
  // Product cards will link directly to category-based URLs
  const productUrls = await getProductCanonicalUrls(products);

  // Fetch review stats for all products in one batch (server-side)
  const productHandles = products.map(p => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);
  
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  
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
    canonicalProductUrls: productUrls,
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
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {pageTitle}
            </h1>
            <div className="max-w-3xl">
              <CollectionDescription description={shortDescription} />
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
            reviewStatsMap={reviewStatsMap}
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

