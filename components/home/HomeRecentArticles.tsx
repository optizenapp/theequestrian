import { listPublishedNewsArticles } from '@/lib/articles/news-public';
import { listItemToBlogCardArticle } from '@/lib/blog/news-adapters';
import { BlogCard } from '@/components/blog/BlogCard';

export async function HomeRecentArticles() {
  const rows = await listPublishedNewsArticles({ limit: 6 });

  if (rows.length === 0) {
    return null;
  }

  const articles = rows.map(listItemToBlogCardArticle);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.4em] text-gray-400 mb-2">News</p>
          <h2 className="text-4xl font-bold text-gray-900">What we&apos;re talking about</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <BlogCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
