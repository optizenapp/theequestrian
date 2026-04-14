import { Metadata } from 'next';
import Link from 'next/link';
import { BRAND_SIZING_DATA } from '@/lib/sizing/sizing-config';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Sizing Charts & Guides | The Equestrian',
  description: 'Find the perfect fit with our comprehensive sizing charts for equestrian apparel, boots, helmets, and more. Browse sizing guides from top brands including Ariat, Tucci, Ego 7, and more.',
  alternates: {
    canonical: `${siteUrl}/sizing`,
  },
  openGraph: {
    title: 'Sizing Charts & Guides | The Equestrian',
    description: 'Find the perfect fit with our comprehensive sizing charts for equestrian apparel, boots, helmets, and more.',
    url: `${siteUrl}/sizing`,
  },
};

export default function SizingPage() {
  // Group brands alphabetically
  const sortedBrands = [...BRAND_SIZING_DATA].sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );

  return (
    <>
      {/* Breadcrumb Schema */}
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
            ],
          }),
        }}
      />

      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumbs */}
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
              <li className="text-gray-900 font-medium">Sizing Charts</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Sizing Charts & Guides
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Find the perfect fit with our comprehensive sizing charts. Select your brand below to view detailed sizing information for apparel, boots, helmets, and accessories.
            </p>
          </div>

          {/* Info Banner */}
          <div className="mb-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Need Help?</h3>
                <p className="text-sm text-gray-700">
                  If you&apos;re unsure about sizing or need assistance, please{' '}
                  <Link href="/contact" className="text-action hover:text-action-hover font-medium underline">
                    contact our team
                  </Link>
                  {' '}and we&apos;ll be happy to help you find the perfect fit.
                </p>
              </div>
            </div>
          </div>

          {/* Brand Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedBrands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/sizing/${brand.slug}`}
                className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-action hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-action transition-colors">
                    {brand.displayName}
                  </h2>
                  <svg 
                    className="w-5 h-5 text-gray-400 group-hover:text-action group-hover:translate-x-1 transition-all" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                
                <div className="space-y-2">
                  {brand.charts.map((chart, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{chart.title}</span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          {/* Additional Help Section */}
          <div className="mt-16 bg-gray-50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Can&apos;t Find Your Brand?
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              We&apos;re constantly adding new sizing guides. If you can&apos;t find sizing information for a specific brand, please reach out to us and we&apos;ll provide you with the measurements you need.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-action text-white rounded-full font-semibold hover:bg-action-hover transition-colors"
            >
              Contact Us
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

