import { Metadata } from 'next';
import { getBlog } from '@/lib/shopify/blogs';
import { BlogCard } from '@/components/blog/BlogCard';

export const metadata: Metadata = {
  title: 'News & Articles | The Equestrian',
  description: 'Latest news, tips, and insights from The Equestrian',
};

export const revalidate = 300; // Revalidate every 5 minutes

export default async function NewsPage() {
  const blog = await getBlog('news');

  if (!blog || blog.articles.edges.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">What we're talking about</h1>
        <p className="text-gray-600">No articles found.</p>
      </div>
    );
  }

  const articles = blog.articles.edges.map(({ node }) => node);

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.4em] text-gray-400 mb-2">News</p>
          <h1 className="text-4xl font-bold text-gray-900">What we're talking about</h1>
        </div>

        {/* Articles Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <BlogCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </div>
  );
}





