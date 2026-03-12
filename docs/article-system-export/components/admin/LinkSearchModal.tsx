"use client";

import { useState, useEffect } from 'react';
import { Search, X, MapPin, Building2, Loader2 } from 'lucide-react';

interface SearchResult {
  type: 'place' | 'entity';
  id: string;
  name: string;
  slug: string;
  url: string;
  metadata?: string; // e.g., "City" or "Hotel in York"
}

interface LinkSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text: string) => void;
}

export function LinkSearchModal({ isOpen, onClose, onInsert }: LinkSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchDebounce = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/search-links?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchDebounce);
  }, [query]);

  const handleInsert = (result: SearchResult) => {
    onInsert(result.url, result.name);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Insert Link</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for places or entities... (e.g., York, Castle, Hotel)"
              autoFocus
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/20 text-sm"
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {query.length < 2 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Type at least 2 characters to search
            </div>
          )}

          {query.length >= 2 && !isLoading && results.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleInsert(result)}
                  className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-yorkshire-pink hover:bg-pink-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {result.type === 'place' ? (
                        <MapPin className="w-5 h-5 text-gray-400 group-hover:text-yorkshire-pink" />
                      ) : (
                        <Building2 className="w-5 h-5 text-gray-400 group-hover:text-yorkshire-pink" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 group-hover:text-yorkshire-pink">
                        {result.name}
                      </p>
                      {result.metadata && (
                        <p className="text-xs text-gray-500 mt-1">{result.metadata}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 font-mono truncate">
                        {result.url}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            Click on a result to insert the link at your cursor position
          </p>
        </div>
      </div>
    </div>
  );
}
