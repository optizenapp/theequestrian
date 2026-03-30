import { stripLiquidFromArticleHtml } from './sanitize-article-html';
import { rewriteInternalArticleLinks } from './rewrite-article-links';

export async function prepareArticleBodyHtml(contentHtml: string): Promise<string> {
  const stripped = stripLiquidFromArticleHtml(contentHtml);
  return rewriteInternalArticleLinks(stripped);
}
