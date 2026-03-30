/**
 * Remove Liquid theme tags from migrated Shopify blog HTML so they are not shown as raw text on headless.
 */
export function stripLiquidFromArticleHtml(html: string): string {
  if (!html) return html;
  return html
    // Liquid control tags
    .replace(/\{%-[\s\S]*?-%\}/g, '')
    .replace(/\{%[\s\S]*?%\}/g, '')
    // Liquid output tags
    .replace(/\{\{-?[\s\S]*?-?\}\}/g, '')
    // Encoded Liquid delimiters that sometimes leak through rich text migrations
    .replace(/&#123;%[\s\S]*?%&#125;/g, '')
    .replace(/&#123;&#123;[\s\S]*?&#125;&#125;/g, '')
    .replace(/&lbrace;&lbrace;[\s\S]*?&rbrace;&rbrace;/gi, '')
    // Known leaked runtime error text from Shopify Liquid
    .replace(/<p>\s*Liquid error:[^<]*<\/p>/gi, '')
    .replace(/Liquid error:[^\n<]*/gi, '')
    .replace(/<p>\s*[^<]*font_url[^<]*<\/p>/gi, '');
}
