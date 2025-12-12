/**
 * Rich Content Component
 * Renders HTML content with beautiful, world-class styling
 * Optimized to prevent CLS (Cumulative Layout Shift)
 */

interface RichContentProps {
  html: string;
}

export function RichContent({ html }: RichContentProps) {
  if (!html) return null;
  
  return (
    <div className="mt-16 bg-white rounded-lg p-8 shadow-sm" style={{ minHeight: '200px' }}>
      <div 
        className="rich-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
