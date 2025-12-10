
import { notFound } from 'next/navigation';
import { getCollectionWithPagination, getCollectionProductCount } from '@/lib/shopify/collections';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getSalePageByPath } from '@/lib/mapping/sale-mapping';
import { RichContent } from '@/components/collection/RichContent';
import { FAQSection } from '@/components/collection/FAQSection';
import { CollectionDescription } from '@/components/CollectionDescription';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
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
  const { collection, products, pageInfo } = await getCollectionWithPagination(
    collectionHandle,
    36,
    afterCursor
  );
  
  // Get total product count
  const totalProductCount = await getCollectionProductCount(collectionHandle);
  
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
  
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl || "/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": pageData?.breadcrumb_label || "Good Deals",
        "item": `${siteUrl}/on-sale`
      }
    ]
  };

  const collectionSchema = generateCollectionStructuredData(
    pageTitle,
    `${siteUrl}/on-sale`,
    pageData?.meta_description || 'Shop sale items',
    undefined,
    products
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
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
            totalCount={totalProductCount}
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

