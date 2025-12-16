'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleButtonClick = () => {
    const trimmedQuery = query.trim();
    
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
      </div>
    </form>
  );
}
