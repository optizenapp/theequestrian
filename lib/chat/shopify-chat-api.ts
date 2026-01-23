/**
 * Shopify Chat API Client
 * 
 * Connects to the /apps/shopify-chat proxy endpoint
 * to send/receive messages via Shopify Inbox backend
 */

import type { ChatMessage, ChatConversation } from '@/types/chat';

const PROXY_BASE = '/apps/shopify-chat';

/**
 * Send a message via the Shopify Chat proxy
 */
export async function sendMessage(
  message: string,
  conversationId?: string
): Promise<ChatMessage> {
  try {
    const response = await fetch(`${PROXY_BASE}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: include cookies for authentication
      body: JSON.stringify({
        message,
        conversationId,
      }),
    });

    if (!response.ok) {
      // If endpoint doesn't exist, try alternative patterns
      if (response.status === 404) {
        console.warn('Chat proxy endpoint not found. Trying alternative patterns...');
        return sendMessageAlternative(message, conversationId);
      }
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id || Date.now().toString(),
      text: data.text || message,
      sender: 'user',
      timestamp: new Date(data.timestamp || Date.now()),
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Alternative method - try different endpoint patterns
 */
async function sendMessageAlternative(
  message: string,
  conversationId?: string
): Promise<ChatMessage> {
  // Try different endpoint patterns
  const endpoints = [
    '/apps/shopify-chat/messages',
    '/apps/shopify-chat/api/send',
    '/apps/shopify-chat/api/messages',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message, conversationId }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          id: data.id || Date.now().toString(),
          text: data.text || message,
          sender: 'user',
          timestamp: new Date(data.timestamp || Date.now()),
        };
      }
    } catch (error) {
      // Try next endpoint
      continue;
    }
  }

  // If all endpoints fail, return a mock message
  console.warn('Could not connect to chat API. Using mock response.');
  return {
    id: Date.now().toString(),
    text: message,
    sender: 'user',
    timestamp: new Date(),
  };
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  conversationId?: string
): Promise<ChatMessage[]> {
  try {
    const url = conversationId
      ? `${PROXY_BASE}/messages?conversation=${conversationId}`
      : `${PROXY_BASE}/messages`;

    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Try alternative endpoints
        return getConversationHistoryAlternative(conversationId);
      }
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.messages || []).map((msg: any) => ({
      id: msg.id,
      text: msg.text || msg.message,
      sender: msg.sender === 'staff' || msg.sender === 'agent' ? 'staff' : 'user',
      timestamp: new Date(msg.timestamp || msg.created_at),
    }));
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return []; // Return empty array on error
  }
}

/**
 * Alternative method for getting conversation history
 */
async function getConversationHistoryAlternative(
  conversationId?: string
): Promise<ChatMessage[]> {
  const endpoints = [
    '/apps/shopify-chat/conversations',
    '/apps/shopify-chat/api/conversations',
    '/apps/shopify-chat/api/messages',
  ];

  for (const endpoint of endpoints) {
    try {
      const url = conversationId ? `${endpoint}?id=${conversationId}` : endpoint;
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || data.conversation?.messages || [];
        return messages.map((msg: any) => ({
          id: msg.id,
          text: msg.text || msg.message,
          sender: msg.sender === 'staff' || msg.sender === 'agent' ? 'staff' : 'user',
          timestamp: new Date(msg.timestamp || msg.created_at),
        }));
      }
    } catch (error) {
      continue;
    }
  }

  return [];
}

/**
 * Get chat configuration (greeting message, etc.)
 */
export async function getChatConfig(): Promise<{
  greetingMessage?: string;
  available?: boolean;
}> {
  try {
    const response = await fetch(`${PROXY_BASE}/config`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return { available: false };
    }

    const data = await response.json();
    return {
      greetingMessage: data.greetingMessage || data.greeting,
      available: true,
    };
  } catch (error) {
    console.warn('Could not fetch chat config from proxy:', error);
    return { available: false };
  }
}

/**
 * Check if chat proxy is available
 */
export async function checkChatAvailability(): Promise<boolean> {
  try {
    const response = await fetch(PROXY_BASE, {
      method: 'HEAD',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}
