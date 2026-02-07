import Link from 'next/link';
import Image from 'next/image';

interface HeroProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  backgroundImageSrc?: string;
  backgroundImageAlt?: string;
}

/**
 * Hero Section Component
 * 
 * Design:
 * - Full-width visually striking hero
 * - Reduced overlay opacity for better image visibility
 * - Optimized with Next.js Image component for LCP improvement
 */
export function Hero({
  title = 'Premium Equestrian Equipment',
  subtitle = 'Everything you need for horse and rider. World-leading brands at competitive prices.',
  ctaText = 'Shop Now',
  ctaLink = '/horse',
  secondaryCtaText = 'View Collections',
  secondaryCtaLink = '/collections',
  backgroundImageSrc = '/hero-image-v2.jpg',
  backgroundImageAlt = 'Equestrian Eventing',
}: HeroProps) {
  return (
    <section className="relative h-[600px] w-full overflow-hidden bg-gray-900">
      {/* Background Image - Optimized for LCP */}
      <div className="absolute inset-0 w-full h-full">
        <Image 
          src={backgroundImageSrc}
          alt={backgroundImageAlt}
          fill
          priority
          quality={85}
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Gradient Overlay: Dark opacity on left for text, transparent on right for image clarity */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/50 to-transparent" />
      </div>

      {/* Content - Positioned in the first third (standard container alignment) */}
      <div className="relative h-full mx-auto max-w-[1400px] px-8 flex flex-col justify-center z-10 pb-16">
        <div className="max-w-xl text-left animate-fade-in-up pl-4 md:pl-8">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-lg">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl md:text-3xl text-gray-100 mb-8 drop-shadow-md font-semibold leading-relaxed tracking-wide">
            {subtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={ctaLink}
              className="btn-primary text-lg px-8 py-4 shadow-xl hover:scale-105 transform transition-transform duration-200 bg-white text-black hover:bg-gray-100 border-none"
            >
              {ctaText}
            </Link>
            
            <Link
              href={secondaryCtaLink}
              className="bg-primary/80 text-white border border-white/60 font-semibold px-8 py-4 rounded-full hover:bg-primary-dark transition-all duration-200 shadow-lg"
            >
              {secondaryCtaText}
            </Link>
          </div>
        </div>
      </div>
      {/* Wavy Bottom Separator */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0]">
        <svg 
          className="relative block w-full h-[50px] text-gray-50" 
          data-name="Layer 1" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            fill="currentColor"
            transform="rotate(180 600 60)"
          ></path>
        </svg>
      </div>
    </section>
  );
}
