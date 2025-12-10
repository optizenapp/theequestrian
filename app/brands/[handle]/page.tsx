
import { notFound } from 'next/navigation';
import { getCollectionWithPagination, getCollectionProductCount } from '@/lib/shopify/collections';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getBrandByHandle } from '@/lib/mapping/brand-mapping';
import { RichContent } from '@/components/collection/RichContent';
import { FAQSection } from '@/components/collection/FAQSection';
import { CollectionDescription } from '@/components/CollectionDescription';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
import { FAQItem } from '@/lib/content/collections';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

interface BrandPageProps {
  params: Promise<{
    handle: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { handle } = await params;
  const brand = getBrandByHandle(handle);

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
  const brand = getBrandByHandle(handle);
  if (!brand) {
    notFound();
  }

  // 2. Fetch Products from Shopify Collection with pagination and sorting
  const { collection, products, pageInfo } = await getCollectionWithPagination(
    brand.handle,
    36,
    afterCursor
  );
  
  // Get total product count
  const totalProductCount = await getCollectionProductCount(brand.handle);
  
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
        "name": "Brands",
        "item": `${siteUrl}/brands`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": brand.breadcrumb_label || brand.title,
        "item": `${siteUrl}/brands/${handle}`
      }
    ]
  };

  const collectionSchema = generateCollectionStructuredData(
    pageTitle,
    `${siteUrl}/brands/${handle}`,
    brand.meta_description || `Shop ${brand.title} products`,
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

