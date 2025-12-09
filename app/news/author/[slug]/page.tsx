import { Metadata } from 'next';
import { getArticlesByAuthor } from '@/lib/shopify/blogs';
import { BlogCard } from '@/components/blog/BlogCard';

interface AuthorPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function generateAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const authorName = slugToName(slug);

  return {
    title: `Articles by ${authorName} | The Equestrian`,
    description: `Read all articles written by ${authorName}`,
  };
}

export const revalidate = 300;

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;
  const authorName = slugToName(slug);
  const articles = await getArticlesByAuthor(authorName);

  const initials = getInitials(authorName);
  const avatarColor = generateAvatarColor(authorName);

  return (
    <div className="bg-gray-50 min-h-screen py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Author Header */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-12">
          <div className="flex items-center gap-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{authorName}</h1>
              <p className="text-gray-600">
                {articles.length} {articles.length === 1 ? 'article' : 'articles'}
              </p>
            </div>
          </div>
        </div>

        {/* Articles */}
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">No articles found by this author.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <BlogCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



