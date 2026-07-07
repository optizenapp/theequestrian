import type { ReactNode } from 'react';

/** Same wave path as `components/Hero.tsx` bottom separator. */
export const HERO_WAVE_PATH =
  'M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z';

const LEFT_WAVE_CLIP_ID = 'hero-image-left-wave';

/** Smooth vertical wave on the left edge — clips image/mask content, not a white overlay. */
const LEFT_WAVE_CLIP_PATH =
  'M0.08,0 C0.02,0.14,0.14,0.26,0.07,0.38 C0.01,0.5,0.13,0.62,0.06,0.74 C0.01,0.86,0.12,0.96,0.08,1 L1,1 L1,0 Z';

type HeroWaveEdgeProps = {
  edge: 'bottom';
  className?: string;
};

/** Decorative wave edge for bottom of hero sections. */
export function HeroWaveEdge({ edge, className = '' }: HeroWaveEdgeProps) {
  if (edge !== 'bottom') return null;

  return (
    <div className={`overflow-hidden leading-[0] ${className}`}>
      <svg
        className="relative block h-[50px] w-full text-gray-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={HERO_WAVE_PATH} fill="currentColor" transform="rotate(180 600 60)" />
      </svg>
    </div>
  );
}

type HeroImageLeftWaveFrameProps = {
  children: ReactNode;
  className?: string;
};

/** Clips children with a wavy left edge (matches home hero wave feel). */
export function HeroImageLeftWaveFrame({ children, className = '' }: HeroImageLeftWaveFrameProps) {
  return (
    <div className={`relative ${className}`}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id={LEFT_WAVE_CLIP_ID} clipPathUnits="objectBoundingBox">
            <path d={LEFT_WAVE_CLIP_PATH} />
          </clipPath>
        </defs>
      </svg>
      <div className="h-full w-full" style={{ clipPath: `url(#${LEFT_WAVE_CLIP_ID})` }}>
        {children}
      </div>
    </div>
  );
}
