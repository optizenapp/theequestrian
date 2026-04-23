import type { ExtractedVideo } from '@/lib/products/extract-videos';

interface ProductVideoSectionProps {
  videos: ExtractedVideo[];
  productTitle: string;
  className?: string;
}

/**
 * Full-width video container shown above the sizing guide. Used for any
 * product whose long description contained a YouTube/Vimeo/Wistia/Loom
 * embed or a HTML5 <video> element. The videos are rendered in a 16:9
 * responsive frame so they look right on mobile and desktop.
 */
export function ProductVideoSection({
  videos,
  productTitle,
  className = '',
}: ProductVideoSectionProps) {
  if (videos.length === 0) return null;

  return (
    <section
      aria-label={`${productTitle} videos`}
      className={`bg-surface rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 my-8 ${className}`.trim()}
    >
      <div className="space-y-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="relative w-full overflow-hidden rounded-xl bg-black"
            style={{ aspectRatio: '16 / 9' }}
          >
            {video.type === 'iframe' ? (
              <iframe
                src={video.src}
                title={video.title || `${productTitle} video`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <div
                className="absolute inset-0 h-full w-full [&>video]:h-full [&>video]:w-full"
                dangerouslySetInnerHTML={{ __html: video.src }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
