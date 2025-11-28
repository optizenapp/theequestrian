import { Hero } from '@/components/Hero';
import { TrustSignals } from '@/components/TrustSignals';
import { getAllCollections } from '@/lib/shopify/collections';
import Link from 'next/link';

export default async function Home() {
  // Fetch featured collections for homepage
  const collections = await getAllCollections();
  const featuredCollections = collections.slice(0, 6);

  return (
    <div>
      {/* Hero Section */}
      <Hero
        title="Premium Equestrian Equipment"
        subtitle="Everything you need for horse and rider. World-leading brands at competitive prices."
        ctaText="Shop Now"
        ctaLink="/horse"
        secondaryCtaText="View Collections"
        secondaryCtaLink="/collections"
      />

      {/* Trust Signals */}
      <TrustSignals />

      {/* Featured Collections */}
      <section className="py-12 md:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Shop by Category
            </h2>
            <p className="text-lg text-gray-600">
              Explore our curated collections
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCollections.map((collection) => (
              <Link
                key={collection.id}
                href={`/${collection.handle}`}
                className="group block bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-primary hover:shadow-md transition-all duration-200 hover:-translate-y-1"
              >
                {collection.image && (
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    <img
                      src={collection.image.url}
                      alt={collection.image.altText || collection.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary transition-colors mb-2">
                    {collection.title}
                  </h3>
                  {collection.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center text-primary font-semibold">
                    Shop Now
                    <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
