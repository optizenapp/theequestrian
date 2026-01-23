'use client';

import { useState } from 'react';

/**
 * Test page to explore the /apps/shopify-chat proxy endpoint
 * 
 * This page helps us discover:
 * - What the proxy endpoint returns
 * - What API endpoints are available
 * - How to send/receive messages
 * 
 * Access at: http://localhost:3000/test-chat-proxy
 */

export default function TestChatProxyPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState('Hello, this is a test message');

  const testEndpoint = async (endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) => {
    setLoading(endpoint);
    try {
      const options: RequestInit = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const contentType = response.headers.get('content-type');
      
      let data;
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setResults((prev) => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          statusText: response.statusText,
          contentType,
          data,
          success: response.ok,
        },
      }));
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        [endpoint]: {
          error: error.message,
          success: false,
        },
      }));
    } finally {
      setLoading(null);
    }
  };

  const endpoints = [
    { url: '/apps/shopify-chat', method: 'GET' as const, label: 'Base endpoint (GET)' },
    { url: '/apps/shopify-chat/api', method: 'GET' as const, label: 'API root (GET)' },
    { url: '/apps/shopify-chat/config', method: 'GET' as const, label: 'Config (GET)' },
    { url: '/apps/shopify-chat/messages', method: 'GET' as const, label: 'Messages (GET)' },
    { url: '/apps/shopify-chat/conversations', method: 'GET' as const, label: 'Conversations (GET)' },
  ];

  const postEndpoints = [
    { url: '/apps/shopify-chat/send', label: 'Send message' },
    { url: '/apps/shopify-chat/messages', label: 'Messages (POST)' },
    { url: '/apps/shopify-chat/api/send', label: 'API send' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Shopify Chat Proxy Endpoint Tester</h1>
          <p className="text-gray-600 mb-4">
            Testing the <code className="bg-gray-100 px-2 py-1 rounded">/apps/shopify-chat</code> proxy endpoint
            to discover available APIs.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">📝 Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Click "Test All GET Endpoints" to discover available endpoints</li>
              <li>Check the results below to see what each endpoint returns</li>
              <li>Try sending a test message using the POST endpoints</li>
              <li>Share the results so we can update the API client</li>
            </ol>
          </div>

          {/* Test All Button */}
          <button
            onClick={() => {
              endpoints.forEach((ep) => testEndpoint(ep.url, ep.method));
            }}
            disabled={loading !== null}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {loading ? 'Testing...' : 'Test All GET Endpoints'}
          </button>
        </div>

        {/* GET Endpoints */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">GET Endpoints</h2>
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div key={ep.url} className="border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      GET {ep.url}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">{ep.label}</span>
                  </div>
                  <button
                    onClick={() => testEndpoint(ep.url, ep.method)}
                    disabled={loading === ep.url}
                    className="px-4 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm disabled:opacity-50"
                  >
                    {loading === ep.url ? 'Testing...' : 'Test'}
                  </button>
                </div>
                
                {results[ep.url] && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          results[ep.url].success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {results[ep.url].status || 'ERROR'}
                      </span>
                      {results[ep.url].contentType && (
                        <span className="text-xs text-gray-600">
                          {results[ep.url].contentType}
                        </span>
                      )}
                    </div>
                    <pre className="overflow-x-auto text-xs bg-white p-2 rounded border">
                      {JSON.stringify(results[ep.url].data || results[ep.url].error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* POST Endpoints */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">POST Endpoints (Send Message)</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Test Message:</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter test message"
            />
          </div>

          <div className="space-y-3">
            {postEndpoints.map((ep) => (
              <div key={ep.url} className="border rounded p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      POST {ep.url}
                    </span>
                    <span className="ml-2 text-sm text-gray-600">{ep.label}</span>
                  </div>
                  <button
                    onClick={() =>
                      testEndpoint(ep.url, 'POST', {
                        message: testMessage,
                        text: testMessage,
                      })
                    }
                    disabled={loading === ep.url}
                    className="px-4 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded text-sm disabled:opacity-50"
                  >
                    {loading === ep.url ? 'Sending...' : 'Send'}
                  </button>
                </div>
                
                {results[ep.url] && (
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          results[ep.url].success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {results[ep.url].status || 'ERROR'}
                      </span>
                      {results[ep.url].contentType && (
                        <span className="text-xs text-gray-600">
                          {results[ep.url].contentType}
                        </span>
                      )}
                    </div>
                    <pre className="overflow-x-auto text-xs bg-white p-2 rounded border">
                      {JSON.stringify(results[ep.url].data || results[ep.url].error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">💡 What to look for:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
            <li><strong>200 OK:</strong> Endpoint exists and returned data</li>
            <li><strong>404 Not Found:</strong> Endpoint doesn't exist</li>
            <li><strong>401/403:</strong> Authentication required</li>
            <li><strong>HTML response:</strong> Might be serving the widget page</li>
            <li><strong>JSON response:</strong> Likely an API endpoint we can use</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
