'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Dismissible promo strip. Single-line on mobile so it does not wrap under the header.
 */
export function HeaderTopBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-[#1DC4C6]/70 px-9 py-1.5 text-center text-xs font-medium text-black sm:px-4 sm:py-2.5 sm:text-sm">
      <div className="container mx-auto flex min-w-0 items-center justify-center">
        <p className="min-w-0 truncate">
          <Link
            href="/rider/helmets/kask-star-lady-pure-shine-swarovski-frame-wg11"
            className="font-bold underline hover:text-black/80"
          >
            $175 OFF (10%) KASK Star Lady Pure Shine Swarovski Frame Helmet
          </Link>
        </p>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-black/10 sm:right-4"
          aria-label="Close announcement"
        >
          <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
