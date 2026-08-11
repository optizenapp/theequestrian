'use client';

import { useEffect, useRef, useState } from 'react';

/** Load BNPL widgets only when near viewport, on first interaction, or after a long fallback. */
export function useDeferredBnplLoad(enabled: boolean) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!enabled || shouldLoad) return;

    const unlock = () => setShouldLoad(true);
    const node = hostRef.current;

    let observer: IntersectionObserver | null = null;
    if (node && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            unlock();
          }
        },
        { rootMargin: '200px 0px' }
      );
      observer.observe(node);
    }

    const onInteract = () => unlock();
    window.addEventListener('pointerdown', onInteract, { once: true, passive: true });
    window.addEventListener('keydown', onInteract, { once: true });

    const timer = window.setTimeout(unlock, 8000);

    return () => {
      observer?.disconnect();
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('keydown', onInteract);
      window.clearTimeout(timer);
    };
  }, [enabled, shouldLoad]);

  return { hostRef, shouldLoad };
}

/** Zip injects a logo <img> without alt — patch once the widget mounts. */
export function useZipAltFix(enabled: boolean, containerId: string) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.getElementById(containerId);
    if (!root) return;

    const patch = () => {
      root.querySelectorAll('img:not([alt])').forEach((img) => {
        img.setAttribute('alt', 'Zip');
      });
    };

    patch();
    const mo = new MutationObserver(patch);
    mo.observe(root, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [enabled, containerId]);
}
