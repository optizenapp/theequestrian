import { Suspense } from 'react';
import { SearchResults } from './SearchResults';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {query ? `Search Results for "${query}"` : 'Search Products'}
      </h1>

      {query ? (
        <Suspense fallback={<div>Loading...</div>}>
          <SearchResults query={query} />
        </Suspense>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">Enter a search term to find products.</p>
        </div>
      )}
    </div>
  );
}
