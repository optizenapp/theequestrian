'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { HeroSlide } from '@/lib/content/home';
import { HeroSlideMedia } from '@/components/hero/HeroSlideMedia';
import { HeroSliderControls } from '@/components/hero/HeroSliderControls';

interface HeroSliderProps {
  slides: HeroSlide[];
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  intervalMs?: number;
}

function slideCta(slide: HeroSlide, fallbackText?: string, fallbackLink?: string) {
  const link = slide.cta_link?.trim() || fallbackLink || '/horse';

  let text = slide.cta_text?.trim();
  if (!text && slide.alt?.trim()) {
    text = `Shop ${slide.alt.trim()}`;
  }
  if (!text) {
    const brandHandle = link.match(/^\/brands\/([^/?#]+)/)?.[1];
    if (brandHandle) {
      text = `Shop ${brandHandle
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')}`;
    }
  }

  return {
    text: text || fallbackText || 'Shop Now',
    link,
  };
}

export function HeroSlider({
  slides,
  title = 'Premium Equestrian Equipment',
  subtitle = 'Everything you need for horse and rider. World-leading brands at competitive prices.',
  ctaText = 'Shop Now',
  ctaLink = '/horse',
  secondaryCtaText = 'View Collections',
  secondaryCtaLink = '/collections',
  intervalMs = 4000,
}: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseTimeoutRef = useRef<number | null>(null);
  const count = slides.length;
  const active = slides[activeIndex] ?? slides[0];
  const primary = slideCta(active, ctaText, ctaLink);

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count]
  );

  const pauseTemporarily = useCallback(() => {
    setPaused(true);
    if (pauseTimeoutRef.current != null) {
      window.clearTimeout(pauseTimeoutRef.current);
    }
    pauseTimeoutRef.current = window.setTimeout(() => {
      setPaused(false);
      pauseTimeoutRef.current = null;
    }, 8000);
  }, []);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1);
    pauseTemporarily();
  }, [activeIndex, goTo, pauseTemporarily]);

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
    pauseTemporarily();
  }, [activeIndex, goTo, pauseTemporarily]);

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current != null) {
        window.clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused]);

  if (!active) return null;

  return (
    <section className="relative h-[600px] w-full overflow-hidden bg-gray-900">
      <div className="absolute inset-0 w-full h-full">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const className = `absolute inset-0 transition-opacity duration-700 ${
            isActive ? 'opacity-100 z-0' : 'opacity-0 z-0 pointer-events-none'
          }`;

          return (
            <HeroSlideMedia
              key={`${slide.src}-${index}`}
              slide={slide}
              index={index}
              isActive={isActive}
              className={className}
            />
          );
        })}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/50 to-transparent z-[1]" />
      </div>

      <div className="relative h-full mx-auto max-w-[1400px] px-8 flex flex-col justify-center z-10 pb-16">
        <div className="max-w-xl text-left animate-fade-in-up pl-4 md:pl-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-lg">
            {title}
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-gray-100 mb-8 drop-shadow-md font-semibold leading-relaxed tracking-wide">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              key={`hero-cta-${activeIndex}`}
              href={primary.link}
              prefetch={false}
              className="btn-primary text-lg px-8 py-4 shadow-xl hover:scale-105 transform transition-transform duration-200 bg-white text-black hover:bg-gray-100 border-none"
            >
              {primary.text}
            </Link>
            {secondaryCtaText && secondaryCtaLink && (
              <Link
                href={secondaryCtaLink}
                className="bg-primary/80 text-white border border-white/60 font-semibold px-8 py-4 rounded-full hover:bg-primary-dark transition-all duration-200 shadow-lg"
              >
                {secondaryCtaText}
              </Link>
            )}
          </div>
        </div>
      </div>

      <HeroSliderControls
        slides={slides}
        activeIndex={activeIndex}
        onPrev={goPrev}
        onNext={goNext}
        onSelect={(index) => {
          goTo(index);
          pauseTemporarily();
        }}
      />

      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-10">
        <svg
          className="relative block w-full h-[50px] text-gray-50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            fill="currentColor"
            transform="rotate(180 600 60)"
          />
        </svg>
      </div>
    </section>
  );
}
