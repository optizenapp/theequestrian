/**
 * Shopify Chat Proxy API Client
 * 
 * Investigates and interacts with the Shopify Chat proxy endpoint:
 * https://www.theequestrian.com.au/apps/shopify-chat
 * 
 * This proxy endpoint may expose APIs we can use to build a custom chat UI
 * while still connecting to Shopify Inbox's backend.
 */

interface ShopifyChatProxyOptions {
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * Base function to call the Shopify Chat proxy endpoint
 */
export async function callShopifyChatProxy<T = any>({
  endpoint = '/apps/shopify-chat',
  method = 'GET',
  body,
  headers = {},
}: ShopifyChatProxyOptions): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include cookies for session
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Shopify Chat Proxy API returned ${response.status}: ${errorText}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    return (await response.text()) as T;
  } catch (error) {
    console.error('Shopify Chat Proxy API Error:', error);
    throw error;
  }
}

/**
 * Explore the proxy endpoint to discover available APIs
 * This is a discovery function to see what endpoints exist
 */
export async function exploreShopifyChatProxy(): Promise<{
  baseEndpoint: string;
  availableEndpoints?: string[];
  methods?: string[];
  response?: any;
}> {
  try {
    // Try common API patterns
    const endpoints = [
      '/apps/shopify-chat',
      '/apps/shopify-chat/api',
      '/apps/shopify-chat/messages',
      '/apps/shopify-chat/conversations',
      '/apps/shopify-chat/send',
      '/apps/shopify-chat/config',
    ];

    const results: Record<string, any> = {};

    for (const endpoint of endpoints) {
      try {
        const response = await callShopifyChatProxy({
          endpoint,
          method: 'GET',
        });
        results[endpoint] = {
          status: 'success',
          data: response,
        };
      } catch (error: any) {
        results[endpoint] = {
          status: 'error',
          error: error.message,
        };
      }
    }

    return {
      baseEndpoint: '/apps/shopify-chat',
      availableEndpoints: Object.keys(results),
      response: results,
    };
  } catch (error) {
    console.error('Failed to explore Shopify Chat Proxy:', error);
    throw error;
  }
}

/**
 * Send a message via the proxy endpoint
 * (This is a placeholder - we need to discover the actual API structure)
 */
export async function sendMessageViaProxy(
  message: string,
  conversationId?: string
): Promise<any> {
  return callShopifyChatProxy({
    endpoint: '/apps/shopify-chat/send',
    method: 'POST',
    body: {
      message,
      conversationId,
    },
  });
}

/**
 * Get conversation history via the proxy endpoint
 * (This is a placeholder - we need to discover the actual API structure)
 */
export async function getConversationHistory(
  conversationId?: string
): Promise<any> {
  return callShopifyChatProxy({
    endpoint: '/apps/shopify-chat/conversations',
    method: 'GET',
  });
}

/**
 * Get chat configuration (greeting message, etc.)
 */
export async function getChatConfig(): Promise<any> {
  return callShopifyChatProxy({
    endpoint: '/apps/shopify-chat/config',
    method: 'GET',
  });
}
