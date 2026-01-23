'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Shopify Inbox Chat Widget Component
 * 
 * Embeds the Shopify Inbox chat widget into the headless storefront.
 * The widget script URL should be extracted from your Shopify theme preview
 * and added to NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL environment variable.
 * 
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { ShopifyInbox } from '@/components/chat/ShopifyInbox';
 * 
 * <body>
 *   <ShopifyInbox />
 * </body>
 * ```
 */
export function ShopifyInbox() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get script URL from environment variable
  // Format: https://cdn.shopify.com/s/files/.../shopifyChatV1.js?shop=your-store.myshopify.com
  const scriptUrl = process.env.NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL;
  const isEnabled = process.env.SHOPIFY_INBOX_ENABLED !== 'false';

  // Don't render if not configured or disabled
  if (!scriptUrl || !isEnabled) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Shopify Inbox: Script URL not configured. ' +
        'Add NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL to your environment variables. ' +
        'To find the script URL: Enable Shopify Inbox in theme customizer, ' +
        'preview theme, open DevTools, search for "shopifyChatV1.js"'
      );
    }
    return null;
  }

  useEffect(() => {
    // Check if widget loaded successfully and wait for full initialization
    const checkWidget = () => {
      if (typeof window !== 'undefined' && window.ShopifyChat) {
        setIsLoaded(true);
        setHasError(false);
        
        // Widget is loaded - configuration comes from Shopify servers
        // The greeting message is configured in Shopify Admin and loads automatically
        if (process.env.NODE_ENV === 'development') {
          console.log('Shopify Inbox widget initialized. Greeting message loads from Shopify Admin configuration.');
        }
      }
    };

    // Check immediately
    checkWidget();

    // Check periodically until widget loads (up to 5 seconds)
    const interval = setInterval(() => {
      if (!isLoaded) {
        checkWidget();
      } else {
        clearInterval(interval);
      }
    }, 500);

    // Cleanup after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isLoaded]);

  return (
    <>
      <Script
        src={scriptUrl}
        strategy="lazyOnload"
        onLoad={() => {
          setIsLoaded(true);
          setHasError(false);
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Shopify Inbox widget loaded successfully');
          }
        }}
        onError={(e) => {
          setHasError(true);
          setIsLoaded(false);
          console.error('❌ Failed to load Shopify Inbox widget:', e);
        }}
      />
    </>
  );
}
