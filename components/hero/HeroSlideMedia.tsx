'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { HeroSlide } from '@/lib/content/home';

interface HeroSlideMediaProps {
  slide: HeroSlide;
  index: number;
  isActive: boolean;
  className: string;
}

export function HeroSlideMedia({ slide, index, isActive, className }: HeroSlideMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const isFirst = index === 0;

  useEffect(() => {
    if (slide.media_type !== 'video') return;
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      if (!video.src) {
        video.src = slide.src;
        video.load();
      }
      void video.play().catch(() => {});
      return;
    }

    video.pause();
    video.currentTime = 0;
    setVideoReady(false);
  }, [isActive, slide.media_type, slide.src]);

  if (slide.media_type === 'video') {
    const poster = slide.poster;
    return (
      <div className={`${className} h-full w-full`}>
        {poster ? (
          <Image
            src={poster}
            alt={slide.alt || ''}
            fill
            priority={isFirst}
            fetchPriority={isFirst ? 'high' : 'auto'}
            quality={70}
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : null}
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
            videoReady && isActive ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden={!isActive}
          onPlaying={() => setVideoReady(true)}
        />
      </div>
    );
  }

  return (
    <Image
      src={slide.src}
      alt={slide.alt || 'Hero banner'}
      fill
      priority={isFirst}
      fetchPriority={isFirst ? 'high' : 'auto'}
      quality={70}
      sizes="100vw"
      className={`${className} object-cover object-center`}
    />
  );
}
