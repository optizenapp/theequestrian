'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SizingChartZoomImageProps {
  src: string;
  alt: string;
  brandName: string;
  chartTitle: string;
  priority?: boolean;
}

export function SizingChartZoomImage({
  src,
  alt,
  brandName,
  chartTitle,
  priority = false,
}: SizingChartZoomImageProps) {
  const [broken, setBroken] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const displaySrc = broken ? '/sizing/placeholder.svg' : src;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (lightboxOpen && !dialog.open) dialog.showModal();
    else if (!lightboxOpen && dialog.open) dialog.close();
  }, [lightboxOpen]);

  const openLightbox = useCallback(() => {
    if (!broken) setLightboxOpen(true);
  }, [broken]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openLightbox}
        className="block w-full text-left rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        aria-label={`Open full size: ${chartTitle}`}
      >
        <Image
          src={displaySrc}
          alt={alt}
          width={1200}
          height={800}
          className="w-full h-auto"
          priority={priority}
          onError={() => setBroken(true)}
        />
      </button>
      {broken ? (
        <p className="text-sm text-amber-600 mt-2 text-center font-medium">
          Chart image not available — contact us for {brandName} sizing help.
        </p>
      ) : (
        <p className="text-sm text-gray-500 mt-2 text-center">Click image to view full size</p>
      )}
      <dialog
        ref={dialogRef}
        className="max-w-[95vw] max-h-[95vh] p-0 rounded-xl border-0 bg-transparent backdrop:bg-black/70"
        onClose={() => setLightboxOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setLightboxOpen(false);
        }}
      >
        <div className="relative bg-white rounded-xl overflow-auto max-h-[95vh] p-2">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-3 right-3 z-10 rounded-full bg-black/70 text-white px-3 py-1 text-sm font-medium"
            aria-label="Close size chart"
          >
            Close
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={displaySrc} alt={alt} className="max-w-full h-auto" />
        </div>
      </dialog>
    </div>
  );
}
