'use client';

import Image from 'next/image';
import { useState } from 'react';

interface SizingChartImageProps {
  src: string;
  alt: string;
  brandName: string;
  chartTitle: string;
  priority?: boolean;
}

/**
 * Client component for sizing chart images with error handling
 */
export function SizingChartImage({ 
  src, 
  alt, 
  brandName, 
  chartTitle, 
  priority = false 
}: SizingChartImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    setImageSrc('/sizing/placeholder.svg');
    setHasError(true);
  };

  return (
    <div className="relative">
      <div className="bg-gray-100 rounded-lg overflow-hidden">
        <Image
          src={imageSrc}
          alt={alt}
          width={1200}
          height={800}
          className="w-full h-auto"
          priority={priority}
          onError={handleError}
        />
      </div>
      {hasError ? (
        <p className="text-sm text-amber-600 mt-2 text-center font-medium">
          Image not yet available - Please contact us for {brandName} {chartTitle.toLowerCase()}
        </p>
      ) : (
        <p className="text-sm text-gray-500 mt-2 text-center">
          Click image to view full size
        </p>
      )}
    </div>
  );
}

