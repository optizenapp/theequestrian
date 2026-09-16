'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import {
  getMetaPixelId,
  isMetaStorefrontTrackingEnabled,
} from '@/lib/analytics/meta-pixel-config';
import { flushMetaPixelQueue, trackMetaPageView } from '@/lib/analytics/meta-pixel';

/**
 * Meta requires the fbq stub in HTML before fbevents.js runs.
 * Installing the stub only in useEffect races (and loses) against afterInteractive Script.
 */
function buildMetaBootstrapScript(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');
fbq('track','PageView');`;
}

export function MetaPixelProvider() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);
  const bootstrappedRef = useRef(false);
  const enabled = isMetaStorefrontTrackingEnabled();
  const pixelId = getMetaPixelId();

  useEffect(() => {
    if (!enabled || !pathname) return;
    // First PageView is sent by the bootstrap snippet; only track SPA navigations here.
    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      lastPathRef.current = pathname;
      flushMetaPixelQueue();
      return;
    }
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    trackMetaPageView();
  }, [enabled, pathname]);

  if (!enabled || !pixelId) return null;

  return (
    <Script id="meta-pixel-bootstrap" strategy="afterInteractive">
      {buildMetaBootstrapScript(pixelId)}
    </Script>
  );
}
