"use client";

import { useState, useEffect } from 'react';
import { Search, X, Building2, Ticket, Loader2, ExternalLink, Globe } from 'lucide-react';

interface AffiliateLink {
  type: string;
  url: string;
}

interface SearchResult {
  type: 'entity' | 'event';
  id: string;
  name: string;
  slug: string;
  metadata?: string;
  affiliates: AffiliateLink[];
  website?: string | null;
}

interface CTAPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (href: string, text: string, affiliateType?: string) => void;
}

// Suggest button text based on affiliate type
function suggestButtonText(entityName: string, affiliateType: string): string {
  const type = affiliateType.toLowerCase();
  if (type.includes('booking')) return `Book ${entityName} on Booking.com`;
  if (type.includes('sykes')) return `Book ${entityName} on Sykes Cottages`;
  if (type.includes('hotelplanner')) return `Check Prices on HotelPlanner`;
  if (type.includes('ticketmaster') || type === 'tickets') return `Buy Tickets for ${entityName}`;
  if (type.includes('viator')) return `Book ${entityName} on Viator`;
  if (type.includes('expedia')) return `Book on Expedia`;
  return `Book ${entityName}`;
}

// Colour for affiliate type badge
function affiliateColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('booking')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (t.includes('sykes')) return 'bg-green-100 text-green-700 border-green-200';
  if (t.includes('ticketmaster') || t === 'tickets') return 'bg-purple-100 text-purple-700 border-purple-200';
  if (t.includes('viator')) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (t.includes('hotelplanner')) return 'bg-cyan-100 text-cyan-700 border-cyan-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

export function CTAPickerModal({ isOpen, onClose, onInsert }: CTAPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualText, setManualText] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setShowManual(false);
      setManualUrl('');
      setManualText('');
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
        const response = await fetch(`/api/admin/search-affiliates?q=${encodeURIComponent(query)}`);
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

  const handlePickAffiliate = (result: SearchResult, affiliate: AffiliateLink) => {
    const text = suggestButtonText(result.name, affiliate.type);
    onInsert(affiliate.url, text, affiliate.type);
    onClose();
  };

  const handlePickWebsite = (result: SearchResult) => {
    if (!result.website) return;
    onInsert(result.website, `Visit ${result.name}`, 'Website');
    onClose();
  };

  const handleManualInsert = () => {
    if (!manualUrl.trim()) return;
    onInsert(manualUrl.trim(), manualText.trim() || 'Learn More', undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[650px] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Insert CTA Button</h2>
              <p className="text-xs text-gray-500 mt-1">Search for an entity or event to insert an affiliate link</p>
            </div>
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
              placeholder="Search entities or events with affiliate links..."
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
          {!showManual && query.length < 2 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              Type at least 2 characters to search for entities with affiliate links
            </div>
          )}

          {!showManual && query.length >= 2 && !isLoading && results.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              No entities with affiliate links found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!showManual && results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="mt-0.5">
                      {result.type === 'event' ? (
                        <Ticket className="w-5 h-5 text-purple-500" />
                      ) : (
                        <Building2 className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{result.name}</p>
                      {result.metadata && (
                        <p className="text-xs text-gray-500 mt-0.5">{result.metadata}</p>
                      )}
                    </div>
                  </div>

                  {/* Affiliate links as clickable buttons */}
                  <div className="flex flex-wrap gap-2 ml-8">
                    {result.affiliates.map((aff, i) => (
                      <button
                        key={i}
                        onClick={() => handlePickAffiliate(result, aff)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all hover:shadow-sm hover:scale-105 ${affiliateColor(aff.type)}`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {aff.type}
                      </button>
                    ))}
                    {result.website && (
                      <button
                        onClick={() => handlePickWebsite(result)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-600 bg-gray-50 transition-all hover:shadow-sm hover:scale-105"
                      >
                        <Globe className="w-3 h-3" />
                        Website
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual URL entry */}
          {showManual && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">URL</label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://..."
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/20 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Button Text</label>
                <input
                  type="text"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="e.g. Book Now, Buy Tickets, Learn More"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yorkshire-pink/20 text-sm"
                />
              </div>
              <button
                onClick={handleManualInsert}
                disabled={!manualUrl.trim()}
                className="w-full py-3 bg-yorkshire-pink text-white font-bold rounded-xl hover:bg-pink-700 transition-all disabled:opacity-50"
              >
                Insert CTA Button
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {showManual ? 'Enter a custom URL and button text' : 'Click an affiliate to insert a styled CTA button'}
          </p>
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-xs font-bold text-yorkshire-pink hover:text-pink-700"
          >
            {showManual ? '← Back to search' : 'Manual URL →'}
          </button>
        </div>
      </div>
    </div>
  );
}
