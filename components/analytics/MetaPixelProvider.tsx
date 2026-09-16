'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import {
  getMetaPixelId,
  isMetaStorefrontTrackingEnabled,
} from '@/lib/analytics/meta-pixel-config';
import { flushMetaPixelQueue, trackMetaPageView } from '@/lib/analytics/meta-pixel';
import { installMetaPixelStub } from '@/lib/analytics/meta-pixel-stub';

export function MetaPixelProvider() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);
  const enabled = isMetaStorefrontTrackingEnabled();
  const pixelId = getMetaPixelId();

  useEffect(() => {
    if (!enabled || !pixelId) return;
    installMetaPixelStub();
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === 'function') {
      fbq('init', pixelId);
    }
  }, [enabled, pixelId]);

  useEffect(() => {
    if (!enabled || !pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    trackMetaPageView();
  }, [enabled, pathname]);

  if (!enabled || !pixelId) return null;

  return (
    <Script
      id="meta-fbevents"
      src="https://connect.facebook.net/en_US/fbevents.js"
      strategy="afterInteractive"
      onLoad={() => {
        const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
        if (typeof fbq === 'function') {
          fbq('init', pixelId);
        }
        flushMetaPixelQueue();
      }}
    />
  );
}
