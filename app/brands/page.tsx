
import Link from 'next/link';
import { getAllBrands } from '@/lib/mapping/brand-mapping';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brands | The Equestrian',
  description: 'Shop top equestrian brands including Equipe, Pikeur, Ariat and more.',
  openGraph: {
    title: 'Shop Top Equestrian Brands | The Equestrian',
    description: 'Browse our extensive collection of premium equestrian brands.',
    type: 'website',
  },
};

export default function BrandsIndexPage() {
  const brands = getAllBrands();

  // Group brands by first letter for easier navigation
  const groupedBrands = brands.reduce((acc, brand) => {
    const letter = brand.title.charAt(0).toUpperCase();
    if (!acc[letter]) {
      acc[letter] = [];
    }
    acc[letter].push(brand);
    return acc;
  }, {} as Record<string, typeof brands>);

  const letters = Object.keys(groupedBrands).sort();

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Hero Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Our Brands
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl leading-relaxed">
            We stock only the finest equestrian brands from around the world. 
            Browse our complete A-Z list of partners and manufacturers.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* A-Z Quick Links */}
        <div className="flex flex-wrap gap-2 mb-12 justify-center">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#${letter}`}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
            >
              {letter}
            </a>
          ))}
        </div>

        {/* Brand Grid */}
        <div className="space-y-16">
          {letters.map((letter) => (
            <div key={letter} id={letter} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2">
                {letter}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {groupedBrands[letter].map((brand) => (
                  <Link
                    key={brand.handle}
                    href={`/brands/${brand.handle}`}
                    className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all group"
                  >
                    <span className="font-medium text-gray-900 group-hover:text-primary transition-colors">
                      {brand.title}
                    </span>
                    {brand.products_count > 0 && (
                      <span className="block text-xs text-gray-500 mt-1">
                        {brand.products_count} products
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

