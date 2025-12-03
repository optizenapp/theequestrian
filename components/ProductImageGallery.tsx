'use client';

/**
 * Product Image Gallery Component
 * 
 * Features:
 * - Thumbnail navigation on the left
 * - Main image display
 * - Hover on thumbnails changes main image
 */

import { useState } from 'react';

interface ImageEdge {
  node: {
    url: string;
    altText: string | null;
  };
}

interface ProductImageGalleryProps {
  images: { edges: ImageEdge[] };
  productTitle: string;
}

export function ProductImageGallery({ images, productTitle }: ProductImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const imageList = images.edges.map(edge => edge.node);
  
  if (imageList.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-8 flex items-center justify-center aspect-square border border-gray-100">
        <div className="text-gray-300">No Image</div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Thumbnail Column */}
      {imageList.length > 1 && (
        <div className="flex flex-col gap-3 w-20">
          {imageList.map((image, index) => (
            <button
              key={index}
              onMouseEnter={() => setSelectedImageIndex(index)}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selectedImageIndex === index
                  ? 'border-gray-200 shadow-md opacity-100'
                  : 'border-gray-200 hover:border-gray-400 opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={image.url}
                alt={image.altText || `${productTitle} - Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div className="flex-1 bg-surface rounded-2xl p-8 flex items-center justify-center aspect-square border border-gray-100 hover:shadow-sm transition-shadow">
        <img
          src={imageList[selectedImageIndex].url}
          alt={imageList[selectedImageIndex].altText || productTitle}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
}

