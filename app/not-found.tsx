import Link from 'next/link';
import { NotFoundLogger } from '@/components/NotFoundLogger';
import { logServerNotFound } from '@/lib/not-found/log';

export const metadata = {
  title: '404 | The Equestrian',
  description: 'We could not find the page you requested.',
  robots: { index: false, follow: true },
};

export default async function NotFoundPage() {
  await logServerNotFound();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <NotFoundLogger />
      <p className="text-sm font-semibold uppercase tracking-wide text-action">404</p>
      <h1 className="mt-3 text-3xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        The page you are looking for does not exist. Try searching or return to the homepage.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-action px-5 py-2 text-sm font-semibold text-white hover:bg-pink-600"
        >
          Go to homepage
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
        >
          Search the store
        </Link>
      </div>
    </div>
  );
}
