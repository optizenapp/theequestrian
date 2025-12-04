import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getArticle, getBlog } from '@/lib/shopify/blogs';
import { AuthorBox } from '@/components/blog/AuthorBox';
import { BlogCard } from '@/components/blog/BlogCard';
import { generateArticleSchema } from '@/lib/schema-generator';

interface ArticlePageProps {
  params: Promise<{
    handle: string;
  }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { handle } = await params;
  const article = await getArticle('news', handle);

  if (!article) {
    return {
      title: 'Article Not Found',
    };
  }

  return {
    title: article.seo?.title || article.title,
    description: article.seo?.description || article.excerpt || '',
  };
}

export const revalidate = 300;

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { handle } = await params;
  const article = await getArticle('news', handle);

  if (!article) {
    notFound();
  }

  // Fetch related articles (3 most recent, excluding current)
  const blog = await getBlog('news', 10);
  const relatedArticles = blog?.articles.edges
    .map(({ node }) => node)
    .filter((a) => a.id !== article.id)
    .slice(0, 3) || [];

  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Generate JSON-LD schema
  const schema = generateArticleSchema(article);

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <article className="bg-white rounded-2xl shadow-sm p-8 lg:p-12">
              {/* Hero Image */}
              {article.image && (
                <div className="relative w-full h-96 rounded-lg overflow-hidden mb-8">
                  <Image
                    src={article.image.url}
                    alt={article.image.altText || article.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-8 pb-8 border-b">
                <span className="font-semibold">{article.author.name}</span>
                <span>•</span>
                <time dateTime={article.publishedAt}>{publishedDate}</time>
              </div>

              {/* Content */}
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />

              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Author Box */}
              <div className="mt-12">
                <AuthorBox author={article.author} />
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              {/* Related Articles */}
              {relatedArticles.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
                  <div className="space-y-6">
                    {relatedArticles.map((relatedArticle) => (
                      <Link
                        key={relatedArticle.id}
                        href={`/news/${relatedArticle.handle}`}
                        className="group block"
                      >
                        <div className="flex gap-4">
                          {relatedArticle.image && (
                            <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                              <Image
                                src={relatedArticle.image.url}
                                alt={relatedArticle.image.altText || relatedArticle.title}
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
                              {new Date(relatedArticle.publishedAt).toLocaleDateString('en-AU', {
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
    </div>
  );
}

