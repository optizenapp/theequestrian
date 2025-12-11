'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Header Top Bar Component
 * 
 * Promotional banner with dismiss functionality
 * Style matches Back Market's announcement bar
 */
export function HeaderTopBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-[#1DC4C6]/70 text-black text-center py-2.5 px-4 text-sm font-medium relative transition-all">
      <div className="container mx-auto flex items-center justify-center">
        <p className="flex items-center gap-1">
          Our daily deals - Global brands at amazing prices!
          <Link 
            href="/on-sale" 
            className="underline font-bold hover:text-black/80 transition-colors"
          >
            Get Started
          </Link>
        </p>

        {/* Close Button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Close announcement"
        >
          <svg 
            className="w-5 h-5 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
