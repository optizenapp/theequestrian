'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Configured Shopify Inbox Component
 * 
 * Since Shopify Admin app embed settings don't apply to headless storefronts,
 * this component manually configures the widget after it loads.
 * 
 * Configuration is done via JavaScript by:
 * 1. Loading the widget
 * 2. Waiting for it to initialize
 * 3. Modifying the DOM to apply your settings
 */

interface InboxConfig {
  colors: {
    background: string;
    text: string;
    buttons: string;
  };
  greetingMessage: string;
}

const DEFAULT_CONFIG: InboxConfig = {
  colors: {
    background: '#00B2A9', // Your Shopify Admin setting
    text: '#FFFFFF',
    buttons: '#6A6A6A', // Your Shopify Admin setting
  },
  greetingMessage: '👋 Hey. Welcome to The Equestrian. If you have a question, just ask. We\'ll reply shortly.',
};

export function ConfiguredShopifyInbox({ config = DEFAULT_CONFIG }: { config?: InboxConfig } = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const scriptUrl = process.env.NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL;
  const shopDomain = 'theequestrian.myshopify.com';
  const isEnabled = process.env.NEXT_PUBLIC_SHOPIFY_INBOX_ENABLED !== 'false';
  const isAdminRoute = pathname?.startsWith('/admin');

  if (!scriptUrl || !isEnabled || isAdminRoute) {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Shopify Inbox disabled for current route/config');
    }
    return null;
  }

  // Add shop parameter to help widget identify the store
  const fullScriptUrl = scriptUrl.includes('?')
    ? `${scriptUrl}&shop=${shopDomain}`
    : `${scriptUrl}?shop=${shopDomain}`;

  useEffect(() => {
    if (!isLoaded) return;

    let observer: MutationObserver | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    const applyConfiguration = () => {
      attempts++;
      let applied = false;

      // Find the store-info element (header)
      const storeInfo = document.querySelector('.store-info') as HTMLElement;
      if (storeInfo) {
        // Force override inline background style
        const currentBg = storeInfo.style.background;
        if (currentBg !== config.colors.background) {
          storeInfo.style.background = config.colors.background;
          storeInfo.setAttribute('style', `background: ${config.colors.background} !important;`);
          applied = true;
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🎨 Applied background:', config.colors.background);
          }
        }
        
        // Override heading color
        const heading = storeInfo.querySelector('h2') as HTMLElement;
        if (heading && heading.style.color !== config.colors.text) {
          heading.style.color = config.colors.text;
          applied = true;
        }

        // Add greeting message to empty paragraph
        const paragraph = storeInfo.querySelector('p[dir="auto"]') as HTMLElement;
        if (paragraph) {
          const currentText = paragraph.textContent?.trim() || '';
          if (currentText === '' || currentText !== config.greetingMessage) {
            paragraph.textContent = config.greetingMessage;
            paragraph.style.color = config.colors.text;
            paragraph.style.fontSize = '14px';
            paragraph.style.marginTop = '8px';
            paragraph.style.lineHeight = '1.5';
            applied = true;
            
            if (process.env.NODE_ENV === 'development') {
              console.log('💬 Applied greeting message');
            }
          }
        }
      }

      // Override send button
      const sendButton = document.querySelector('.composer-bar__footer-button') as HTMLElement;
      if (sendButton) {
        sendButton.style.backgroundColor = config.colors.buttons;
        sendButton.style.color = config.colors.text;
        applied = true;
      }

      // Override instant answer buttons
      const answerButtons = document.querySelectorAll('.outline-button.instant-answers-list__prompt');
      if (answerButtons.length > 0) {
        answerButtons.forEach((button) => {
          const btn = button as HTMLElement;
          btn.style.borderColor = config.colors.buttons;
          btn.style.color = config.colors.buttons;
        });
        applied = true;
      }

      // Stop observing when configuration is applied.
      if (applied && storeInfo && observer) {
        observer.disconnect();
        observer = null;
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Configuration applied successfully');
        }
      }

      return applied;
    };

    // Apply immediately and then react to DOM mutations instead of polling.
    applyConfiguration();

    observer = new MutationObserver(() => {
      if (attempts < maxAttempts) {
        applyConfiguration();
      } else if (observer) {
        observer.disconnect();
        observer = null;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Safety timeout to avoid long-lived observers.
    timeoutId = setTimeout(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    }, 15000);

    // Cleanup
    return () => {
      if (observer) observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoaded, config]);

  return (
    <Script
      src={fullScriptUrl}
      strategy="lazyOnload"
      onLoad={() => {
        setIsLoaded(true);
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Shopify Inbox widget loaded');
          console.log('📝 Script URL:', fullScriptUrl);
          console.log('📝 Will apply configuration in 2 seconds...');
        }
      }}
      onError={(e) => {
        console.error('❌ Failed to load Shopify Inbox widget:', e);
        console.error('📝 Attempted URL:', fullScriptUrl);
      }}
    />
  );
}
