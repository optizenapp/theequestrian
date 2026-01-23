/**
 * Proxy Explorer Component
 * 
 * A development tool to explore the Shopify Chat proxy endpoint
 * and discover available APIs for building a custom chat UI.
 * 
 * Usage: Add this component temporarily to test the proxy endpoint
 */

'use client';

import { useState } from 'react';
import { exploreShopifyChatProxy, callShopifyChatProxy } from '@/lib/chat/shopify-chat-proxy';

export function ProxyExplorer() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplore = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try calling the explore function via our API route
      const response = await fetch('/api/chat/explore-proxy');
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || 'Failed to explore proxy');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to explore proxy');
    } finally {
      setLoading(false);
    }
  };

  const testEndpoint = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await callShopifyChatProxy({ endpoint });
      setResults({ [endpoint]: result });
    } catch (err: any) {
      setError(err.message || `Failed to call ${endpoint}`);
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md bg-white border border-gray-300 rounded-lg shadow-lg p-4">
      <h3 className="font-bold text-sm mb-2">Shopify Chat Proxy Explorer</h3>
      <button
        onClick={handleExplore}
        disabled={loading}
        className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Exploring...' : 'Explore Proxy'}
      </button>

      <div className="mt-4 space-y-2">
        <button
          onClick={() => testEndpoint('/apps/shopify-chat')}
          disabled={loading}
          className="block w-full text-left px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Test: /apps/shopify-chat
        </button>
        <button
          onClick={() => testEndpoint('/apps/shopify-chat/api')}
          disabled={loading}
          className="block w-full text-left px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Test: /apps/shopify-chat/api
        </button>
        <button
          onClick={() => testEndpoint('/apps/shopify-chat/messages')}
          disabled={loading}
          className="block w-full text-left px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
        >
          Test: /apps/shopify-chat/messages
        </button>
      </div>

      {error && (
        <div className="mt-4 p-2 bg-red-100 text-red-700 text-xs rounded">
          Error: {error}
        </div>
      )}

      {results && (
        <div className="mt-4 p-2 bg-gray-50 text-xs rounded max-h-64 overflow-auto">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
