'use client';

/**
 * Product Image Gallery Component
 * 
 * Features:
 * - Thumbnail navigation on the left
 * - Main image display
 * - Hover on thumbnails changes main image
 * - Optimized LCP with fetchpriority="high" on main image
 * - Responsive image sizes (thumbnails at 160x160)
 */

import { useState, useEffect } from 'react';

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

/**
 * Resize Shopify CDN images using their image transformation API
 * @param url - Original Shopify CDN URL
 * @param size - Desired size (e.g., '160x160', '800x800')
 * @returns Optimized image URL
 */
function getShopifyImageUrl(url: string, size: string): string {
  if (!url) return url;
  
  // Shopify CDN URLs can be resized by adding _${size} before the file extension
  // Example: image.jpg?v=123 -> image_160x160.jpg?v=123
  
  // Handle URLs with query parameters
  const [baseUrl, queryString] = url.split('?');
  const lastDotIndex = baseUrl.lastIndexOf('.');
  
  if (lastDotIndex === -1) return url; // No extension found
  
  const resizedUrl = `${baseUrl.substring(0, lastDotIndex)}_${size}${baseUrl.substring(lastDotIndex)}`;
  
  return queryString ? `${resizedUrl}?${queryString}` : resizedUrl;
}

export function ProductImageGallery({ images, productTitle }: ProductImageGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  const imageList = images.edges.map(edge => edge.node);
  
  // Preload the first image for faster LCP
  useEffect(() => {
    if (imageList.length > 0) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageList[0].url;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [imageList]);
  
  if (imageList.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-8 flex items-center justify-center aspect-square border border-gray-100">
        <div className="text-gray-300">No Image</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Main Image */}
      <div className="flex-1 bg-surface rounded-2xl p-8 flex items-center justify-center aspect-square border border-gray-100 hover:shadow-sm transition-shadow order-1 lg:order-2">
        <img
          src={imageList[selectedImageIndex].url}
          alt={imageList[selectedImageIndex].altText || productTitle}
          className="max-w-full max-h-full object-contain"
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* Thumbnail Column/Row */}
      {imageList.length > 1 && (
        <div className="flex flex-row lg:flex-col gap-3 w-full lg:w-20 order-2 lg:order-1 overflow-x-auto scrollbar-hide">
          {imageList.map((image, index) => (
            <button
              key={index}
              onMouseEnter={() => setSelectedImageIndex(index)}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImageIndex === index
                  ? 'border-gray-200 shadow-md opacity-100'
                  : 'border-gray-200 hover:border-gray-400 opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={getShopifyImageUrl(image.url, '160x160')}
                alt={image.altText || `${productTitle} - Image ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                width="80"
                height="80"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
