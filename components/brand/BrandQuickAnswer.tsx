interface BrandQuickAnswerProps {
  text: string;
}

/**
 * 40–60 word entity-first answer block rendered between the H1 and the
 * above-grid description. Optimised for AI answer engines (Google AI
 * Overviews, Perplexity, Gemini) that prefer a concise factual paragraph
 * with the brand as subject in the first sentence.
 */
export function BrandQuickAnswer({ text }: BrandQuickAnswerProps) {
  if (!text?.trim()) return null;

  return (
    <div
      className="mt-4 rounded-md border-l-4 border-primary bg-primary/5 px-5 py-4 text-base text-gray-800"
      data-testid="brand-quick-answer"
    >
      <p className="leading-relaxed">{text}</p>
    </div>
  );
}
