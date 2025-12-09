import Link from 'next/link';
import Image from 'next/image';
import { ShopifyArticle } from '@/types/shopify';

interface BlogCardProps {
  article: ShopifyArticle;
}

export function BlogCard({ article }: BlogCardProps) {
  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Truncate excerpt to ~150 characters
  const excerpt = article.excerpt || article.excerptHtml?.replace(/<[^>]*>/g, '') || '';
  const truncatedExcerpt = excerpt.length > 150 ? excerpt.substring(0, 150) + '...' : excerpt;

  return (
    <Link href={`/news/${article.handle}`} className="group">
      <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
        {/* Image */}
        {article.image && (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 mb-4">
            <Image
              src={article.image.url}
              alt={article.image.altText || article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <p className="text-xs text-primary font-semibold uppercase tracking-[0.4em] mb-2">
            News
          </p>

          <h3 className="text-xl font-semibold text-gray-900 line-clamp-2 mb-3 group-hover:text-[#E91E8C] transition-colors">
            {article.title}
          </h3>

          <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
            {truncatedExcerpt}
          </p>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
            <span>{article.author.name}</span>
            <span>{publishedDate}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}



