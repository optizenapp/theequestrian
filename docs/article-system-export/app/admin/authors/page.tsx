import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit2, ExternalLink } from 'lucide-react';

export default async function AdminAuthorsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN' && user?.role !== 'EDITOR') redirect('/');

  const authors = await prisma.user.findMany({
    where: { is_author: true },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      website_url: true,
    },
    orderBy: { name: 'asc' },
  });

  const articleCounts = await prisma.article.groupBy({
    by: ['author_id'],
    where: {
      author_id: { in: authors.map((a) => a.id) },
      status: 'published',
    },
    _count: true,
  });

  const countMap = new Map(articleCounts.map((c) => [c.author_id, c._count]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Authors</h1>
          <p className="text-gray-500 mt-1">
            Manage article authors. {authors.length} author{authors.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Link
          href="/admin/authors/new"
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Author
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-bold text-gray-700">Author</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700">Bio</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700">Articles</th>
              <th className="text-left px-4 py-3 font-bold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author) => (
              <tr key={author.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {author.image ? (
                      <img
                        src={author.image}
                        alt={author.name || ''}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                        {author.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="font-bold text-gray-900">{author.name || 'Unnamed'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{author.email}</td>
                <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                  {author.bio ? author.bio.substring(0, 80) + (author.bio.length > 80 ? '...' : '') : <span className="text-gray-400">No bio</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-gray-900">{countMap.get(author.id) || 0}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/authors/${author.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    {author.website_url && (
                      <a
                        href={author.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Website"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {authors.length === 0 && (
          <div className="p-8 text-center text-gray-500">No authors yet.</div>
        )}
      </div>
    </div>
  );
}
