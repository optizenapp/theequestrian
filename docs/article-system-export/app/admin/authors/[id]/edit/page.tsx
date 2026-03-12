import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import AuthorEditForm from './AuthorEditForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditAuthorPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'EDITOR') redirect('/');

  const author = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      bio: true,
      website_url: true,
      is_author: true,
      background_image: true,
    },
  });

  if (!author) notFound();

  const articleCount = await prisma.article.count({
    where: { author_id: id, status: 'published' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Edit Author</h1>
        <p className="text-gray-500 mt-1">{author.name} — {articleCount} published article{articleCount !== 1 ? 's' : ''}</p>
      </div>

      <AuthorEditForm author={author} />
    </div>
  );
}
