/**
 * Lazy Section Component
 * 
 * Wrapper that loads children only when they enter the viewport
 * Reduces initial JavaScript execution and improves LCP
 */

'use client';

import { ReactNode } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
  minHeight?: string;
}

export function LazySection({
  children,
  fallback,
  rootMargin = '100px',
  className = '',
  minHeight,
}: LazySectionProps) {
  const { ref, isVisible } = useIntersectionObserver({ rootMargin });

  return (
    <div 
      ref={ref} 
      className={className}
      style={!isVisible && minHeight ? { minHeight } : undefined}
    >
      {isVisible ? children : fallback}
    </div>
  );
}
