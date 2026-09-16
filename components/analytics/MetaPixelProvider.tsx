'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  getMetaPixelId,
  isMetaStorefrontTrackingEnabled,
} from '@/lib/analytics/meta-pixel-config';
import { flushMetaPixelQueue, trackMetaPageView } from '@/lib/analytics/meta-pixel';

/**
 * SPA PageView tracking only. Bootstrap (stub + init + first PageView) lives in
 * app/layout.tsx as a server Script so fbq exists before fbevents.js runs.
 */
export function MetaPixelProvider() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);
  const enabled = isMetaStorefrontTrackingEnabled();
  const pixelId = getMetaPixelId();

  useEffect(() => {
    if (!enabled || !pixelId || !pathname) return;
    // First PageView is sent by the layout bootstrap snippet.
    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      lastPathRef.current = pathname;
      flushMetaPixelQueue();
      return;
    }
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    trackMetaPageView();
  }, [enabled, pixelId, pathname]);

  return null;
}
