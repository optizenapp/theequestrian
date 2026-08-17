import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BRAND_SIZING_DATA,
  getBrandSizing,
  getAllBrandSlugs,
} from '@/lib/sizing/sizing-config';
import { getBrandContentByHandle } from '@/lib/content/brand-content';
import { BrandSizingPanel } from '@/components/sizing/BrandSizingPanel';
import { getBrandSizingForHandle } from '@/lib/sizing/resolve-brand-sizing';

export const revalidate = 3600;

interface BrandSizingPageProps {
  params: Promise<{
    brand: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllBrandSlugs();
  return slugs.map((slug) => ({
    brand: slug,
  }));
}

export async function generateMetadata({ params }: BrandSizingPageProps): Promise<Metadata> {
  const { brand: brandSlug } = await params;
  const sizing = await getBrandSizingForHandle(brandSlug);
  const config = getBrandSizing(brandSlug);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  const displayName = sizing.displayName || config?.displayName;

  if (!displayName && sizing.source === 'empty') {
    return {
      title: 'Sizing Guide Not Found | The Equestrian',
    };
  }

  const name = displayName || brandSlug;
  return {
    title: `${name} Sizing Guide | The Equestrian`,
    description: `Find the perfect fit with our comprehensive ${name} sizing charts. View detailed sizing information for boots, apparel, and accessories.`,
    alternates: {
      canonical: `${siteUrl}/sizing/${brandSlug}`,
    },
    openGraph: {
      title: `${name} Sizing Guide | The Equestrian`,
      description: `Find the perfect fit with our comprehensive ${name} sizing charts.`,
      url: `${siteUrl}/sizing/${brandSlug}`,
    },
  };
}

export default async function BrandSizingPage({ params }: BrandSizingPageProps) {
  const { brand: brandSlug } = await params;
  const sizing = await getBrandSizingForHandle(brandSlug);
  const config = getBrandSizing(brandSlug);
  const brandRow = await getBrandContentByHandle(brandSlug);

  if (!config && !brandRow && sizing.source === 'empty') {
    notFound();
  }

  const sortedBrands = [...BRAND_SIZING_DATA].sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  const displayName = sizing.displayName || config?.displayName || brandSlug;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: siteUrl,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Sizing Charts',
                item: `${siteUrl}/sizing`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: displayName,
                item: `${siteUrl}/sizing/${brandSlug}`,
              },
            ],
          }),
        }}
      />

      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <nav className="mb-8 text-sm">
            <ol className="flex items-center gap-2 text-gray-600">
              <li>
                <Link href="/" className="hover:text-action transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <Link href="/sizing" className="hover:text-action transition-colors">
                  Sizing Charts
                </Link>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li className="text-gray-900 font-medium">{displayName}</li>
            </ol>
          </nav>

          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {displayName} Sizing Guide
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl">
              Find the perfect fit with our comprehensive sizing charts for {displayName} products.
              Use these guides to ensure you order the correct size.
            </p>
            {brandRow ? (
              <p className="mt-3">
                <Link
                  href={`/brands/${brandRow.handle}#sizing`}
                  className="text-sm font-semibold text-action hover:text-action-hover"
                >
                  View sizing on the {displayName} brand page
                </Link>
              </p>
            ) : null}
          </div>

          <div className="mb-8">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              {sortedBrands.map((brandItem) => {
                const isActive = brandItem.slug === brandSlug;
                return (
                  <Link
                    key={brandItem.slug}
                    href={`/sizing/${brandItem.slug}`}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                      isActive
                        ? 'bg-action text-white border-action'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-action hover:text-action'
                    }`}
                  >
                    {brandItem.displayName}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Sizing Tips</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Measure yourself before ordering for the most accurate fit</li>
                  <li>• If you&apos;re between sizes, we recommend sizing up for comfort</li>
                  <li>• Contact us if you need help determining your size</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
            <BrandSizingPanel sizing={{ ...sizing, sizingPagePath: null }} />
          </div>

          <div className="mt-16 bg-gray-50 rounded-xl p-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help with Sizing?</h2>
              <p className="text-gray-600 mb-6">
                If you&apos;re unsure about which size to order or need additional measurements,
                our team is here to help. We want to make sure you get the perfect fit.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-action text-white rounded-full font-semibold hover:bg-action-hover transition-colors"
                >
                  Contact Us
                </Link>
                <Link
                  href="/sizing"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-full font-semibold hover:border-action hover:text-action transition-colors"
                >
                  View All Sizing Guides
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
