import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getPublishedNewsArticleBySlug,
  listPublishedNewsArticles,
} from '@/lib/articles/news-public';
import { AuthorBox } from '@/components/blog/AuthorBox';
import { ArticleCommerceCtaBar } from '@/components/blog/ArticleCommerceCtaBar';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { generateArticleSchema } from '@/lib/schema-generator';
import { prepareArticleBodyHtml } from '@/lib/blog/prepare-article-html';
import { splitArticleHtmlAfterParagraphs } from '@/lib/blog/split-article-for-related';
import { loadBlogArticleCommerce } from '@/lib/blog/article-commerce';
import {
  detailToArticleSchemaInput,
  detailToCommerceInput,
} from '@/lib/blog/news-adapters';
import { extractEmbeddedRelatedHandles } from '@/lib/blog/extract-embedded-related';
import { extractCommerceSignalsFromHtml } from '@/lib/blog/extract-commerce-signals';

interface ArticlePageProps {
  params: Promise<{
    handle: string;
  }>;
}

function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/+$/, '');
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { handle } = await params;
  const article = await getPublishedNewsArticleBySlug(handle);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  const base = siteBaseUrl();
  const canonical = `${base}/news/${handle}`;
  const title = article.meta_title?.trim() || article.title;
  const description = article.meta_description?.trim() || article.excerpt || '';
  const ogImage = article.featured_image_url || undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      title,
      description,
      publishedTime: article.published_at || undefined,
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                alt: article.featured_image_alt || title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export const revalidate = 300;

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { handle } = await params;
  const article = await getPublishedNewsArticleBySlug(handle);

  if (!article) {
    notFound();
  }

  const embeddedRelated = extractEmbeddedRelatedHandles(article.content);
  const commerceSignals = extractCommerceSignalsFromHtml(article.content);

  const [processedHtml, commerce] = await Promise.all([
    prepareArticleBodyHtml(embeddedRelated.cleanedHtml),
    loadBlogArticleCommerce(
      detailToCommerceInput(
        article,
        embeddedRelated.relatedHandlesRaw,
        commerceSignals.ctaPathHint
      )
    ),
  ]);

  const schema = generateArticleSchema(
    detailToArticleSchemaInput(article, processedHtml)
  );

  const split = splitArticleHtmlAfterParagraphs(processedHtml, 2);
  const useSplit = split.after.trim().length > 0;

  const relatedList = await listPublishedNewsArticles({
    limit: 4,
    excludeArticleId: article.article_id,
  });
  const relatedArticles = relatedList.slice(0, 3);

  const publishedDate = new Date(
    article.published_at || article.updated_at || '1970-01-01T00:00:00.000Z'
  ).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const publishedIso =
    article.published_at || article.updated_at || '1970-01-01T00:00:00.000Z';
  const ctaHref = commerce.ctaPath.startsWith('/') ? commerce.ctaPath : `/${commerce.ctaPath}`;
  const authorName = article.author_name?.trim() || 'The Equestrian';

  return (
    <div className="bg-gray-50 min-h-screen py-12 pb-28 lg:pb-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <article className="bg-white rounded-2xl shadow-sm p-8 lg:p-12">
              {article.featured_image_url && (
                <div className="relative w-full h-96 rounded-lg overflow-hidden mb-8">
                  <Image
                    src={article.featured_image_url}
                    alt={article.featured_image_alt || article.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">{article.title}</h1>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-8 pb-8 border-b">
                <span className="font-semibold">{authorName}</span>
                <span>•</span>
                <time dateTime={publishedIso}>{publishedDate}</time>
              </div>

              <div
                className="article-content"
                dangerouslySetInnerHTML={{
                  __html: useSplit ? split.before : processedHtml,
                }}
              />

              {commerce.products.length > 0 && (
                <div className="mx-auto w-full max-w-4xl">
                  <RelatedProducts
                    products={commerce.products}
                    reviewStatsMap={commerce.reviewStatsMap}
                    productHrefByHandle={commerce.productHrefByHandle}
                    heading="Shop related products"
                    className="py-8 lg:py-10 border-gray-100"
                  />
                </div>
              )}

              {useSplit && (
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: split.after }}
                />
              )}

              {article.tag_names.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t">
                  {article.tag_names.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {commerce.products.length > 0 && (
                <div className="mx-auto w-full max-w-4xl">
                  <RelatedProducts
                    products={commerce.products}
                    reviewStatsMap={commerce.reviewStatsMap}
                    productHrefByHandle={commerce.productHrefByHandle}
                    heading="Shop related products"
                    className="py-8 lg:py-10 border-gray-100 mt-8"
                  />
                </div>
              )}

              <div className="mt-12">
                <AuthorBox author={{ name: authorName }} />
              </div>
            </article>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              <div className="hidden lg:block bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Shop These Products
                </p>
                <Link
                  href={ctaHref}
                  className="inline-flex w-full items-center justify-center rounded-full bg-[#E91E8C] px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#d01a7d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C] focus-visible:ring-offset-2"
                >
                  {commerce.ctaLabel}
                </Link>
              </div>

              {relatedArticles.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
                  <div className="space-y-6">
                    {relatedArticles.map((relatedArticle) => (
                      <Link
                        key={relatedArticle.article_id}
                        href={`/news/${relatedArticle.slug}`}
                        className="group block"
                      >
                        <div className="flex gap-4">
                          {relatedArticle.featured_image_url && (
                            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                              <Image
                                src={relatedArticle.featured_image_url}
                                alt={
                                  relatedArticle.featured_image_alt || relatedArticle.title
                                }
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-[#E91E8C] transition-colors">
                              {relatedArticle.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(
                                relatedArticle.published_at || '1970-01-01T00:00:00.000Z'
                              ).toLocaleDateString('en-AU', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <Link
                    href="/news"
                    className="block mt-6 text-center text-[#E91E8C] hover:underline font-semibold"
                  >
                    View All Articles →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ArticleCommerceCtaBar href={ctaHref} label={commerce.ctaLabel} />
    </div>
  );
}
