import Link from 'next/link';
import { ShopifyAuthor } from '@/types/shopify';

interface AuthorBoxProps {
  author: ShopifyAuthor;
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
  // Generate a consistent color based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

export function AuthorBox({ author }: AuthorBoxProps) {
  const initials = getInitials(author.name);
  const avatarColor = generateAvatarColor(author.name);
  const authorSlug = author.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>

        {/* Author Info */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            <Link
              href={`/news/author/${authorSlug}`}
              className="hover:text-[#E91E8C] transition-colors block"
            >
              {author.name}
            </Link>
          </h3>
          <Link
            href={`/news/author/${authorSlug}`}
            className="text-sm text-[#E91E8C] hover:underline"
          >
            View all articles by {author.name} →
          </Link>
        </div>
      </div>
    </div>
  );
}






