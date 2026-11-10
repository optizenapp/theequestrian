'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import { FaCoins, FaGift, FaInfinity, FaStar } from 'react-icons/fa';

const MESSAGES: Array<{ icon: IconType; text: string }> = [
  { icon: FaGift, text: 'Earn Equestrian Rewards on every order' },
  { icon: FaStar, text: 'Use your rewards on your next order' },
  { icon: FaCoins, text: 'See exactly what you’ll earn on every product' },
  { icon: FaInfinity, text: 'Your rewards never expire' },
];

function MessageGroup({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {MESSAGES.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 px-6 sm:px-10">
          <Icon className="h-3.5 w-3.5 shrink-0 text-black/80 sm:h-4 sm:w-4" aria-hidden />
          <Link
            href="/rewards"
            tabIndex={hidden ? -1 : undefined}
            className="whitespace-nowrap font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {text}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Dismissible scrolling rewards strip; pauses on hover/focus and stays still for reduced motion. */
export function HeaderTopBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      className="marquee relative overflow-hidden bg-[#1DC4C6]/70 py-1.5 pr-9 text-xs text-black sm:py-2.5 sm:text-sm"
      role="region"
      aria-label="Equestrian Rewards"
    >
      <div className="marquee-track flex w-max">
        <MessageGroup />
        <MessageGroup hidden />
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-0 top-0 flex h-full items-center bg-[#8ee2e3] px-2 hover:bg-[#7dd8d9] sm:px-3"
        aria-label="Close announcement"
      >
        <svg className="h-4 w-4 text-black/70 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
