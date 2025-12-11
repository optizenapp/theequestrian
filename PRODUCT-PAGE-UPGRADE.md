# Product Page Upgrade

## 1. Product Description Styling
- **Problem**: Description text was unstyled (no paragraphs, headings, lists).
- **Solution**: Applied Tailwind Typography (`@tailwindcss/typography`) via `prose` classes to `ProductDescription.tsx`.
- **Classes Used**: `prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-action hover:prose-a:text-action-hover`.

## 2. Related Products
- **Problem**: No "Related Products" section on product pages.
- **Solution**:
    - Created `components/product/RelatedProducts.tsx`.
    - Integrated into `app/[category]/[subcategory]/[product]/page.tsx` (new route) and `app/products/[handle]/page.tsx` (legacy route).
    - **Performance**: Fetches related products and their review stats **server-side** to prevent client-side waterfalls. Uses `getRecommendedProducts(4)`.

## 3. Future "World Class" NLP/SEO Improvements
To further align with Google Patents (Entity Salience, Passage Indexing) and NLP best practices:

1.  **Structured Content Blocks**: Parse the HTML description and break it into logical sections (Features, Specs, Care Instructions) rather than a single blob.
2.  **Entity Highlighting**: Automatically identify and link key entities (brands, technologies, materials) to their respective collection pages.
3.  **Table of Contents**: For long descriptions, auto-generate a sticky TOC based on H2/H3 tags.
4.  **FAQ Schema Integration**: If the description contains Q&A, extract it into structured `FAQPage` schema.
5.  **Semantic Analysis**: Use an NLP library to extract "Key Benefits" if they aren't explicitly provided, and display them in a "Highlights" box (already partially done with `featureHighlights` but hardcoded currently).

