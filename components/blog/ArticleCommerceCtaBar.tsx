'use client';

import Link from 'next/link';

type Props = {
  href: string;
  label: string;
};

/**
 * Fixed bottom commerce CTA on small/medium viewports; desktop uses sidebar CTA on the article page.
 */
export function ArticleCommerceCtaBar({ href, label }: Props) {
  return (
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      role="region"
      aria-label="Shop call to action"
    >
      <Link
        href={href}
        className="flex w-full items-center justify-center rounded-full bg-[#E91E8C] px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#d01a7d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
        aria-label={label}
      >
        {label}
      </Link>
    </div>
  );
}
