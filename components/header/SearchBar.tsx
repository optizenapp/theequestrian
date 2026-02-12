'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Search Bar Component
 * 
 * Features:
 * - Submit on Enter key
 * - Submit on button click
 * - Navigates to /search?q=query
 * - Client-side navigation (fast)
 */
export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    products: Array<{
      type: 'product';
      id: string;
      handle: string;
      title: string;
      imageUrl?: string | null;
      imageAlt?: string | null;
      price?: string | null;
      currencyCode?: string | null;
    }>;
    collections: Array<{
      type: 'collection';
      id: string;
      urlPath: string;
      title: string;
      imageUrl?: string | null;
      imageAlt?: string | null;
    }>;
  }>({ products: [], collections: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults({ products: [], collections: [] });
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setResults({ products: [], collections: [] });
          setIsOpen(false);
          return;
        }
        const data = await response.json();
        const nextResults = data?.results ?? { products: [], collections: [] };
        setResults({
          products: Array.isArray(nextResults.products) ? nextResults.products : [],
          collections: Array.isArray(nextResults.collections) ? nextResults.collections : [],
        });
        setIsOpen(
          (nextResults.products?.length || 0) > 0 || (nextResults.collections?.length || 0) > 0
        );
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setResults({ products: [], collections: [] });
          setIsOpen(false);
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (trimmedQuery) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleButtonClick = () => {
    if (trimmedQuery) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl" autoComplete="off">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.products.length > 0 || results.collections.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder="What are you looking for?"
          className="w-full rounded-full border border-gray-300 py-2.5 pl-4 pr-12 text-sm focus:border-action focus:outline-none focus:ring-1 focus:ring-action bg-gray-50"
        />
        <button 
          type="button"
          onClick={handleButtonClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-500 hover:text-action transition-colors"
          aria-label="Search"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-gray-200 bg-white shadow-lg z-50">
            <div className="px-4 py-3 text-xs text-gray-500 border-b border-gray-100">
              {isLoading
                ? 'Searching...'
                : results.products.length + results.collections.length > 0
                ? 'Top results'
                : 'No results found'}
            </div>
            <div className="max-h-80 overflow-auto">
              {results.collections.length > 0 && (
                <div className="px-4 pt-3 text-xs uppercase tracking-wide text-gray-500">Categories</div>
              )}
              {results.collections.map((item) => (
                <Link
                  key={item.id}
                  href={item.urlPath}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt || item.title}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">Category</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-500">Category</div>
                  </div>
                </Link>
              ))}
              {results.products.length > 0 && (
                <div className="px-4 pt-3 text-xs uppercase tracking-wide text-gray-500">Products</div>
              )}
              {results.products.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.handle}`}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt || item.title}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{item.title}</div>
                    {item.price && item.currencyCode && (
                      <div className="text-xs text-gray-500">
                        {item.currencyCode} {item.price}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
              {!isLoading && results.products.length + results.collections.length === 0 && (
                <div className="px-4 py-4 text-sm text-gray-500">Try a different search term.</div>
              )}
            </div>
            <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
              Press Enter to view all results.
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
