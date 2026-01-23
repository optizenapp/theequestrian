'use client';

import { useState, useEffect } from 'react';
import { openShopifyChat, isShopifyChatLoaded } from '@/lib/chat/inbox-controls';

interface ChatButtonProps {
  /**
   * Button text/label
   * @default "Chat with us"
   */
  label?: string;
  
  /**
   * Button variant/style
   * @default "default"
   */
  variant?: 'default' | 'outline' | 'ghost' | 'icon';
  
  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean;
  
  /**
   * Custom className for styling
   */
  className?: string;
  
  /**
   * Size variant
   * @default "default"
   */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Custom chat button component that triggers Shopify Inbox programmatically
 * 
 * This provides a custom-styled button that matches your design system
 * while still using the Shopify Inbox widget functionality.
 * 
 * @example
 * ```tsx
 * // Simple usage
 * <ChatButton />
 * 
 * // Custom styling
 * <ChatButton 
 *   label="Need help?"
 *   variant="outline"
 *   className="my-custom-class"
 * />
 * 
 * // Icon-only button
 * <ChatButton 
 *   variant="icon"
 *   label=""
 * />
 * ```
 */
export function ChatButton({
  label = 'Chat with us',
  variant = 'default',
  showIcon = true,
  className = '',
  size = 'default',
}: ChatButtonProps) {
  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

  useEffect(() => {
    // Check if widget is loaded
    const checkWidget = () => {
      setIsWidgetLoaded(isShopifyChatLoaded());
    };

    checkWidget();
    
    // Check periodically until widget loads
    const interval = setInterval(() => {
      if (!isWidgetLoaded) {
        checkWidget();
      } else {
        clearInterval(interval);
      }
    }, 500);

    // Cleanup after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isWidgetLoaded]);

  const handleClick = () => {
    if (!isWidgetLoaded) {
      console.warn('Shopify Chat widget not loaded yet. Please wait.');
      return;
    }
    openShopifyChat();
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-action text-white hover:bg-action-hover',
    outline: 'border-2 border-action text-action hover:bg-action hover:text-white',
    ghost: 'text-action hover:bg-action/10',
    icon: 'p-2 text-action hover:bg-action/10 rounded-full',
  };

  // Base button classes
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-lg
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={!isWidgetLoaded}
        className={baseClasses}
        aria-label={label || 'Open chat'}
        title={label || 'Open chat'}
      >
        {showIcon && (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isWidgetLoaded}
      className={baseClasses}
      aria-label={label}
    >
      {showIcon && (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      )}
      <span>{label}</span>
      {!isWidgetLoaded && (
        <span className="text-xs opacity-75">(Loading...)</span>
      )}
    </button>
  );
}
