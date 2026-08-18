'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mobile sticky chrome: hide while scrolling down, show again on scroll up.
 * Promo / extra rows should only render while `atTop`.
 */
export function useMobileHeaderScroll(paused = false): { hidden: boolean; atTop: boolean } {
  const [hidden, setHidden] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    if (paused) {
      setHidden(false);
      return;
    }

    lastY.current = window.scrollY;
    setAtTop(window.scrollY < 16);

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      setAtTop(y < 16);

      if (y < 16) {
        setHidden(false);
        return;
      }
      if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [paused]);

  return { hidden, atTop };
}
