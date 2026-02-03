'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function NotFoundLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    fetch('/api/404', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
