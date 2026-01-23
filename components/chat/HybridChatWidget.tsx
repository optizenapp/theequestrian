'use client';

import { useState, useEffect } from 'react';
import { getMergedConfig, type InboxConfig } from '@/lib/chat/inbox-config';
import type { ChatMessage } from '@/types/chat';

/**
 * Hybrid Chat Widget
 * 
 * This component provides a custom UI while using Shopify Inbox's backend.
 * 
 * How it works:
 * 1. Loads Shopify Inbox widget (hidden)
 * 2. Uses window.ShopifyChat API to send messages
 * 3. Displays messages in custom branded UI
 * 4. Uses your Shopify Inbox settings (colors, greeting, etc.)
 */

export function HybridChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<InboxConfig | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);

  useEffect(() => {
    // Load configuration
    const mergedConfig = getMergedConfig();
    setConfig(mergedConfig);

    // Check if Shopify Chat widget is loaded
    const checkWidget = () => {
      if (typeof window !== 'undefined' && window.ShopifyChat) {
        setWidgetReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkWidget()) return;

    // Poll until widget loads
    const interval = setInterval(() => {
      if (checkWidget()) {
        clearInterval(interval);
      }
    }, 500);

    // Cleanup after 10 seconds
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !widgetReady) return;

    const messageText = input.trim();
    setInput('');

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send via Shopify Chat widget
    try {
      if (window.ShopifyChat?.sendMessage) {
        window.ShopifyChat.sendMessage(messageText);
      } else {
        // Fallback: open the widget and let user send there
        console.warn('sendMessage not available, opening widget');
        window.ShopifyChat?.open();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleOpenWidget = () => {
    // Open the actual Shopify widget as fallback
    if (window.ShopifyChat) {
      window.ShopifyChat.open();
    }
  };

  if (!config) return null;

  // Position classes
  const getPositionClasses = () => {
    const horizontal = config.horizontalPosition === 'left' ? 'left-6' : 'right-6';
    let vertical = 'bottom-6';
    if (config.verticalPosition === 'higher') vertical = 'bottom-24';
    else if (config.verticalPosition === 'highest') vertical = 'bottom-40';
    return `${vertical} ${horizontal}`;
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${getPositionClasses()} z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105`}
          style={{
            backgroundColor: config.colors.background,
            color: config.colors.text,
          }}
          aria-label="Open chat"
        >
          {config.icon !== 'none' && (
            <span className="text-xl">
              {config.icon === 'chat-bubble' && '💬'}
              {config.icon === 'hand-wave' && '👋'}
            </span>
          )}
          {config.label !== 'none' && (
            <span className="font-medium">{config.label}</span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 w-full max-w-[415px] h-[700px] max-h-[93vh] bg-white shadow-2xl rounded-t-lg flex flex-col z-50"
          style={{
            [config.horizontalPosition === 'left' ? 'left' : 'right']: 0,
          }}
        >
          {/* Header */}
          <div
            className="p-4 rounded-t-lg flex justify-between items-center"
            style={{
              backgroundColor: config.colors.background,
              color: config.colors.text,
            }}
          >
            <h2 className="font-semibold text-lg">Chat with us</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:opacity-80 text-xl"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Greeting Message */}
            {messages.length === 0 && (
              <div className="text-gray-600 text-sm mb-4">
                {config.greetingMessage}
              </div>
            )}

            {/* Message List */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender === 'user'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  style={
                    msg.sender === 'user'
                      ? { backgroundColor: config.colors.background }
                      : {}
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Widget Not Ready Message */}
            {!widgetReady && messages.length === 0 && (
              <div className="text-center text-sm text-gray-500 mt-4">
                Loading chat...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            {widgetReady ? (
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-6 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: config.colors.buttons,
                  }}
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="text-center">
                <button
                  onClick={handleOpenWidget}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Open Shopify Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
