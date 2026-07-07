'use client';

import Image from 'next/image';
import { useState } from 'react';

type BrandLogoSize = 'sm' | 'md';

const sizeClasses: Record<BrandLogoSize, string> = {
  sm: 'h-12 w-20',
  md: 'h-20 w-32',
};

interface BrandLogoProps {
  src: string;
  alt: string;
  size?: BrandLogoSize;
  className?: string;
}

export function BrandLogo({ src, alt, size = 'sm', className = '' }: BrandLogoProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className={`relative shrink-0 ${sizeClasses[size]} ${className}`}
      data-testid="brand-logo"
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain object-right"
        sizes={size === 'sm' ? '80px' : '128px'}
        onError={() => setVisible(false)}
      />
    </div>
  );
}
