'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Top progress bar that shows during navigation
 * Appears when user clicks a link and disappears when page loads
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset loading state when route changes
    setIsLoading(false);
    setProgress(0);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Listen for navigation start
    const handleStart = () => {
      setIsLoading(true);
      setProgress(0);
    };

    // Simulate progress
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setProgress((prev) => {
          // Slow down as we approach 90%
          if (prev >= 90) return prev;
          if (prev >= 70) return prev + 1;
          if (prev >= 50) return prev + 3;
          return prev + 10;
        });
      }, 200);
    }

    // Listen for clicks on links
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && !link.target && !link.download) {
        const url = new URL(link.href);
        const currentUrl = new URL(window.location.href);
        
        // Only show loader for internal navigation
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          handleStart();
        }
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-primary transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        boxShadow: '0 0 10px rgba(var(--color-primary), 0.5)',
      }}
    />
  );
}
