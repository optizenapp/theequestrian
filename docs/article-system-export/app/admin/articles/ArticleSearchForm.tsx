"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Filter } from "lucide-react";

interface Props {
  initialQuery: string;
  initialStatus: string;
}

export function ArticleSearchForm({ initialQuery, initialStatus }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [showFilters, setShowFilters] = useState(!!initialStatus);

  // Sync state when navigating back to /admin/articles (props change but component stays mounted)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setStatus(initialStatus);
    setShowFilters(!!initialStatus);
  }, [initialStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    router.push(`/admin/articles?${params.toString()}`);
  };

  const handleClear = () => {
    setQuery("");
    setStatus("");
    router.push("/admin/articles");
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (newStatus) params.set("status", newStatus);
    router.push(`/admin/articles?${params.toString()}`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
      <form onSubmit={handleSubmit} className="flex gap-2 flex-1 md:flex-none">
        <div className="relative flex-1 md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search articles..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/30" 
          />
          {(query || status) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 border rounded-xl transition-colors ${
            showFilters || status 
              ? 'bg-yorkshire-pink text-white border-yorkshire-pink' 
              : 'bg-white border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-5 h-5" />
        </button>
      </form>

      {showFilters && (
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/30"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      )}
    </div>
  );
}
