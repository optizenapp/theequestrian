'use client';

import { useState, useEffect } from 'react';
import { getMergedConfig, type InboxConfig } from '@/lib/chat/inbox-config';
import { sendMessage as sendMessageViaAPI, getConversationHistory } from '@/lib/chat/shopify-chat-api';
import type { ChatMessage } from '@/types/chat';

/**
 * Custom Chat Widget Component
 * 
 * A fully customizable chat UI that uses Shopify Inbox settings
 * but gives you complete control over the design and behavior.
 * 
 * Features:
 * - Uses Shopify Inbox configuration (colors, greeting, position)
 * - Fully customizable UI
 * - Can connect to /apps/shopify-chat proxy for backend
 * - Matches your brand perfectly
 */

export function CustomChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<InboxConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  useEffect(() => {
    // Load configuration
    const mergedConfig = getMergedConfig();
    setConfig(mergedConfig);
  }, []);

  useEffect(() => {
    // Load conversation history when chat opens
    if (isOpen && conversationId) {
      loadConversationHistory();
    }
  }, [isOpen, conversationId]);

  const loadConversationHistory = async () => {
    try {
      setIsLoading(true);
      const history = await getConversationHistory(conversationId);
      setMessages(history);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Position classes based on config
  const getPositionClasses = () => {
    if (!config) return 'bottom-6 right-6';
    
    const horizontal = config.horizontalPosition === 'left' ? 'left-6' : 'right-6';
    
    let vertical = 'bottom-6';
    if (config.verticalPosition === 'higher') {
      vertical = 'bottom-24';
    } else if (config.verticalPosition === 'highest') {
      vertical = 'bottom-40';
    }
    
    return `${vertical} ${horizontal}`;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput('');

    // Add user message to UI immediately (optimistic update)
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      setIsLoading(true);
      
      // Send via API
      const sentMessage = await sendMessageViaAPI(messageText, conversationId);
      
      // Update with server response if different
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === userMessage.id ? sentMessage : msg
        )
      );

      // TODO: Poll for staff responses or use WebSocket if available
      // For now, we'll rely on the proxy to handle responses
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error message to user
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, there was an error sending your message. Please try again.',
        sender: 'staff',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!config) {
    return null; // Loading config
  }

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
          aria-label={config.label !== 'none' ? config.label : 'Open chat'}
        >
          {/* Icon */}
          {config.icon !== 'none' && (
            <span className="text-xl">
              {config.icon === 'chat-bubble' && '💬'}
              {config.icon === 'email' && '✉️'}
              {config.icon === 'question-mark' && '❓'}
              {config.icon === 'smiley-face' && '😊'}
              {config.icon === 'team' && '👥'}
              {config.icon === 'hand-wave' && '👋'}
            </span>
          )}
          
          {/* Label */}
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
            <h2 className="font-semibold text-lg">
              {config.label !== 'none' ? config.label : 'Chat with us'}
            </h2>
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
            {/* Greeting Message - only show if no messages */}
            {messages.length === 0 && (
              <div className="text-gray-600 text-sm mb-4">
                {config.greetingMessage}
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
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
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-0"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: config.colors.buttons,
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
