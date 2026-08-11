'use client';

import type { HeroSlide } from '@/lib/content/home';

interface HeroSliderControlsProps {
  slides: HeroSlide[];
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
}

export function HeroSliderControls({
  slides,
  activeIndex,
  onPrev,
  onNext,
  onSelect,
}: HeroSliderControlsProps) {
  if (slides.length <= 1) return null;

  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 sm:left-6 lg:h-12 lg:w-12"
      >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M10.957 12l3.47-3.47a.75.75 0 10-1.06-1.06L9.72 11.116a1.25 1.25 0 000 1.768l3.646 3.646a.75.75 0 001.06-1.06L10.958 12" clipRule="evenodd" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/55 sm:right-6 lg:h-12 lg:w-12"
      >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M13.043 12l-3.47 3.47a.75.75 0 101.06 1.06l3.647-3.646a1.25 1.25 0 000-1.768L10.634 7.47a.75.75 0 00-1.06 1.06L13.042 12" clipRule="evenodd" />
        </svg>
      </button>
      <div className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((slide, index) => (
          <button
            key={`${slide.src}-dot-${index}`}
            type="button"
            aria-label={`Show slide ${index + 1}`}
            aria-current={index === activeIndex}
            onClick={() => onSelect(index)}
            className="flex h-6 w-6 items-center justify-center rounded-full"
          >
            <span
              className={`rounded-full transition-all ${
                index === activeIndex
                  ? 'h-2.5 w-8 bg-white'
                  : 'h-2.5 w-2.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          </button>
        ))}
      </div>
    </>
  );
}
