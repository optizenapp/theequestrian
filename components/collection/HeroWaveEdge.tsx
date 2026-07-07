/** Same wave path as `components/Hero.tsx` bottom separator. */
export const HERO_WAVE_PATH =
  'M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z';

type HeroWaveEdgeProps = {
  edge: 'bottom' | 'left';
  className?: string;
};

/** Decorative wave edge — bottom (home hero) or left (collection heroes). */
export function HeroWaveEdge({ edge, className = '' }: HeroWaveEdgeProps) {
  if (edge === 'bottom') {
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

  return (
    <div
      className={`pointer-events-none absolute left-0 top-0 z-10 h-full w-9 overflow-hidden leading-[0] text-white sm:w-10 md:w-12 lg:w-14 ${className}`}
      aria-hidden="true"
    >
      <svg
        className="absolute left-1/2 top-1/2 h-[220%] w-14 -translate-x-1/2 -translate-y-1/2 rotate-90"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <path d={HERO_WAVE_PATH} fill="currentColor" transform="rotate(180 600 60)" />
      </svg>
    </div>
  );
}
