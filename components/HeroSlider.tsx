'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { HeroSlide } from '@/lib/content/home';

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
  return {
    text: fallbackText || 'Shop Now',
    link: slide.cta_link?.trim() || fallbackLink || '/horse',
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
  intervalMs = 3000,
}: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
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

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused]);

  useEffect(() => {
    slides.forEach((slide, index) => {
      const video = videoRefs.current[index];
      if (!video || slide.media_type !== 'video') return;
      if (index === activeIndex) {
        void video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex, slides]);

  if (!active) return null;

  return (
    <section
      className="relative h-[600px] w-full overflow-hidden bg-gray-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 w-full h-full">
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          const className = `absolute inset-0 transition-opacity duration-700 ${
            isActive ? 'opacity-100 z-0' : 'opacity-0 z-0 pointer-events-none'
          }`;

          if (slide.media_type === 'video') {
            return (
              <video
                key={`${slide.src}-${index}`}
                ref={(el) => {
                  videoRefs.current[index] = el;
                }}
                className={`${className} h-full w-full object-cover object-center`}
                src={slide.src}
                poster={slide.poster}
                muted
                loop
                playsInline
                preload={index === 0 ? 'auto' : 'metadata'}
                aria-hidden={!isActive}
              />
            );
          }

          return (
            <Image
              key={`${slide.src}-${index}`}
              src={slide.src}
              alt={slide.alt || 'Hero banner'}
              fill
              priority={index === 0}
              quality={75}
              sizes="100vw"
              className={`${className} object-cover object-center`}
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
              key={primary.link}
              href={primary.link}
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

      {count > 1 && (
        <div className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((slide, index) => (
            <button
              key={`${slide.src}-dot-${index}`}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              aria-current={index === activeIndex}
              onClick={() => goTo(index)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                index === activeIndex ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}

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
