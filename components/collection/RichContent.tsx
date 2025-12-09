/**
 * Rich Content Component
 * Renders HTML content with beautiful, world-class styling
 */

interface RichContentProps {
  html: string;
}

export function RichContent({ html }: RichContentProps) {
  return (
    <div className="mt-16 bg-white rounded-lg p-8 shadow-sm">
      <div 
        className="rich-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
