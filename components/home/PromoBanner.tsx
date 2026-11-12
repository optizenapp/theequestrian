import Link from 'next/link';
import { getImageProps } from 'next/image';
import type { PromoBannerConfig } from '@/lib/content/promo-banner';

interface PromoBannerProps {
  banner: PromoBannerConfig;
}

export function PromoBanner({ banner }: PromoBannerProps) {
  const { desktop, mobile } = banner;
  if (!desktop) return null;

  const common = { alt: banner.alt, quality: 80, sizes: '100vw', priority: true } as const;
  const {
    props: { srcSet: desktopSrcSet, ...imgProps },
  } = getImageProps({ ...common, src: desktop.src, width: desktop.width, height: desktop.height });
  const mobileSrcSet = mobile
    ? getImageProps({ ...common, src: mobile.src, width: mobile.width, height: mobile.height }).props.srcSet
    : undefined;

  return (
    <section className="w-full bg-black">
      <h1 className="sr-only">{banner.heading}</h1>
      <Link href={banner.href} prefetch={false} className="block focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white">
        <picture>
          {mobile ? (
            <source
              media="(max-width: 767px)"
              srcSet={mobileSrcSet}
              width={mobile.width}
              height={mobile.height}
            />
          ) : null}
          <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
          <img {...imgProps} alt={banner.alt} className="block h-auto w-full" />
        </picture>
      </Link>
    </section>
  );
}
