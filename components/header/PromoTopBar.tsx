'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaTag } from 'react-icons/fa';
import type { HeaderPromo } from '@/lib/content/promo-banner';

/** Messages repeat so one group is wider than large screens and the loop has no gap. */
const REPEATS = 3;

function MessageGroup({ promo, hidden }: { promo: HeaderPromo; hidden?: boolean }) {
  const items = Array.from({ length: REPEATS }, (_, r) =>
    promo.announcements.map((text, i) => ({ key: `${r}-${i}`, text, repeat: r > 0 }))
  ).flat();

  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map(({ key, text, repeat }) => (
        <li key={key} className="flex items-center gap-2 px-6 sm:px-10" aria-hidden={repeat || undefined}>
          <FaTag className="h-3.5 w-3.5 shrink-0 text-white/90 sm:h-4 sm:w-4" aria-hidden />
          <Link
            href={promo.href}
            tabIndex={hidden || repeat ? -1 : undefined}
            className="whitespace-nowrap font-bold uppercase tracking-wide hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {text}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Dismissible scrolling promo strip shown under the rewards strip while a promo is active. */
export function PromoTopBar({ promo }: { promo: HeaderPromo }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      className="marquee relative overflow-hidden bg-[#DB1A84] py-1.5 pr-9 text-xs text-white sm:py-2.5 sm:text-sm"
      role="region"
      aria-label={promo.navLabel}
    >
      <div className="marquee-track flex w-max">
        <MessageGroup promo={promo} />
        <MessageGroup promo={promo} hidden />
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-0 top-0 flex h-full items-center bg-[#B8146E] px-2 hover:bg-[#9E115F] sm:px-3"
        aria-label="Close Black Friday announcement"
      >
        <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
