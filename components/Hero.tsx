import Link from 'next/link';

interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

/**
 * Hero Section Component (Back Market style)
 * 
 * Features:
 * - Large, bold headline
 * - Gradient background (placeholder for image)
 * - Primary and secondary CTAs
 * - Clean, minimal design
 * - Responsive layout
 */
export function Hero({
  title = 'Premium Equestrian Equipment',
  subtitle = 'Everything you need for horse and rider. World-leading brands at competitive prices.',
  ctaText = 'Shop Now',
  ctaLink = '/horse',
  secondaryCtaText = 'View Collections',
  secondaryCtaLink = '/collections',
}: HeroProps) {
  return (
    <section className="relative bg-gradient-to-br from-primary-pale via-white to-secondary-pale overflow-hidden">
      {/* Background Pattern (optional decorative element) */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full filter blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-16 md:py-24 lg:py-32">
          <div className="max-w-3xl">
            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              {title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-700 mb-8 md:mb-10 max-w-2xl">
              {subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={ctaLink}
                className="btn-primary inline-flex items-center justify-center text-center"
              >
                {ctaText}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              
              <Link
                href={secondaryCtaLink}
                className="btn-outline inline-flex items-center justify-center text-center"
              >
                {secondaryCtaText}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative wave at bottom (optional) */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-12 text-white"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0v46.29c47.79 22.2 103.59 32.17 158 28 70.36-5.37 136.33-33.31 206.8-37.5 73.84-4.36 147.54 16.88 218.2 35.26 69.27 18 138.3 24.88 209.4 13.08 36.15-6 69.85-17.84 104.45-29.34C989.49 25 1113-14.29 1200 52.47V0z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  );
}

/**
 * Compact Hero for Collection Pages
 */
interface CompactHeroProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href: string }>;
}

export function CompactHero({ title, description, breadcrumbs }: CompactHeroProps) {
  return (
    <section className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-4 flex items-center text-sm text-gray-600">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center">
                <svg className="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="text-lg text-gray-700 max-w-3xl">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
