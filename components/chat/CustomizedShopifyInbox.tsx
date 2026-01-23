'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Customized Shopify Inbox Component
 * 
 * This component loads the Shopify Inbox widget but overrides:
 * - Colors (background, text, buttons)
 * - Greeting message
 * - Positioning
 * - Styling
 * 
 * The backend functionality (sending/receiving messages) remains unchanged.
 * All messages still go to Shopify Inbox.
 */

interface CustomizationConfig {
  colors?: {
    background?: string;
    text?: string;
    buttons?: string;
  };
  greetingMessage?: string;
  position?: {
    horizontal?: 'left' | 'right';
    vertical?: 'bottom' | 'top';
  };
}

export function CustomizedShopifyInbox({
  colors = {
    background: '#BD7AB3', // Your brand Mauve
    text: '#FFFFFF',
    buttons: '#5DBEBD', // Your brand Teal
  },
  greetingMessage = '👋 Hey. Welcome to The Equestrian. If you have a question, just ask. We\'ll reply shortly.',
  position = {
    horizontal: 'right',
    vertical: 'bottom',
  },
}: CustomizationConfig = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const baseScriptUrl = process.env.NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL;
  const shopDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'theequestrian.myshopify.com';
  const isEnabled = process.env.SHOPIFY_INBOX_ENABLED !== 'false';

  if (!baseScriptUrl || !isEnabled) {
    return null;
  }

  // Try using the loader script first, fallback to widget script
  const loaderUrl = baseScriptUrl?.replace('shopifyChatV1Widget.js', 'inbox-chat-loader.js');
  const widgetUrl = baseScriptUrl;

  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Base script URL:', baseScriptUrl);
    console.log('📝 Loader URL:', loaderUrl);
    console.log('📝 Shop domain:', shopDomain);
  }

  useEffect(() => {
    if (!isLoaded) return;

    // Wait for widget to fully initialize
    const customizeWidget = () => {
      // Apply custom CSS to override widget styles
      const style = document.createElement('style');
      style.id = 'shopify-inbox-custom-styles';
      style.textContent = `
        /* Override send button */
        .composer-bar__footer-button {
          background-color: ${colors.buttons} !important;
          color: ${colors.text} !important;
        }

        .composer-bar__footer-button:hover {
          opacity: 0.9 !important;
        }

        /* Override instant answers buttons */
        .outline-button.instant-answers-list__prompt {
          border-color: ${colors.buttons} !important;
          color: ${colors.buttons} !important;
        }

        .outline-button.instant-answers-list__prompt:hover {
          background-color: ${colors.buttons} !important;
          color: ${colors.text} !important;
        }

        /* Override instant answers heading */
        .instant-answers {
          color: ${colors.background} !important;
        }

        /* Override chat button (when minimized) */
        .chat-button,
        [data-spec="chat-button"] {
          background-color: ${colors.background} !important;
          color: ${colors.text} !important;
        }

        /* Override message bubbles (user messages) */
        .message-user,
        .message--user {
          background-color: ${colors.background} !important;
          color: ${colors.text} !important;
        }

        /* Override input text color */
        .composer-bar__message-text {
          color: #333 !important;
        }
      `;

      // Remove existing custom styles if any
      const existingStyle = document.getElementById('shopify-inbox-custom-styles');
      if (existingStyle) {
        existingStyle.remove();
      }

      document.head.appendChild(style);

      // Override inline styles and content
      const applyCustomizations = () => {
        let customized = false;

        // Check if widget is in an iframe
        const iframes = document.querySelectorAll('iframe');
        let targetDocument: Document = document;
        
        // Try to find the Shopify Chat iframe
        for (const iframe of iframes) {
          try {
            // Try to access iframe content (will fail if cross-origin)
            if (iframe.contentDocument) {
              const chatUI = iframe.contentDocument.getElementById('chat-ui');
              if (chatUI) {
                targetDocument = iframe.contentDocument;
                if (process.env.NODE_ENV === 'development') {
                  console.log('✅ Found Shopify Chat in iframe');
                }
                break;
              }
            }
          } catch (e) {
            // Cross-origin iframe, can't access
            continue;
          }
        }

        // If not in iframe, check main document
        if (targetDocument === document && !document.getElementById('chat-ui')) {
          // Widget not loaded yet
          return false;
        }

        // 1. Override store-info background (has inline style="background: black;")
        const storeInfo = targetDocument.querySelector('.store-info') as HTMLElement;
        if (storeInfo) {
          storeInfo.style.background = colors.background || '#BD7AB3';
          customized = true;
        }

        // 2. Override store-info heading color
        const heading = targetDocument.querySelector('.store-info-heading h2') as HTMLElement;
        if (heading) {
          heading.style.color = colors.text || '#FFFFFF';
          customized = true;
        }

        // 3. Add greeting message to empty paragraph
        const paragraph = targetDocument.querySelector('.store-info p[dir="auto"]') as HTMLElement;
        if (paragraph && (!paragraph.textContent || paragraph.textContent.trim() === '')) {
          paragraph.textContent = greetingMessage;
          paragraph.style.color = colors.text || '#FFFFFF';
          paragraph.style.marginTop = '8px';
          paragraph.style.fontSize = '14px';
          paragraph.style.lineHeight = '1.5';
          customized = true;
        }

        // 4. Override instant answers button styles (they have inline styles)
        const instantAnswerButtons = targetDocument.querySelectorAll('.outline-button.instant-answers-list__prompt');
        instantAnswerButtons.forEach((button) => {
          const btn = button as HTMLElement;
          btn.style.borderColor = colors.buttons || '#5DBEBD';
          btn.style.color = colors.buttons || '#5DBEBD';
          customized = true;
        });

        // 5. Inject CSS into iframe if needed
        if (targetDocument !== document) {
          const iframeStyle = targetDocument.getElementById('shopify-inbox-custom-styles');
          if (!iframeStyle) {
            const style = targetDocument.createElement('style');
            style.id = 'shopify-inbox-custom-styles';
            style.textContent = `
              .composer-bar__footer-button {
                background-color: ${colors.buttons} !important;
                color: ${colors.text} !important;
              }
              .outline-button.instant-answers-list__prompt:hover {
                background-color: ${colors.buttons} !important;
                color: ${colors.text} !important;
              }
            `;
            targetDocument.head.appendChild(style);
          }
        }

        if (customized && process.env.NODE_ENV === 'development') {
          console.log('✅ Shopify Inbox widget customized');
        }

        return customized;
      };

      // Try to apply customizations immediately
      applyCustomizations();

      // Also try after delays (widget loads content asynchronously)
      setTimeout(applyCustomizations, 100);
      setTimeout(applyCustomizations, 500);
      setTimeout(applyCustomizations, 1000);
      setTimeout(applyCustomizations, 2000);

      // Watch for DOM changes and re-apply customizations
      const observer = new MutationObserver(() => {
        applyCustomizations();
      });

      // Observe the chat UI for changes
      const chatUI = document.getElementById('chat-ui');
      if (chatUI) {
        observer.observe(chatUI, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style'],
        });
      } else {
        // If chat UI not found yet, observe the whole body
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      // Cleanup after 15 seconds
      setTimeout(() => observer.disconnect(), 15000);

      return observer;
    };

    // Customize after widget loads
    setTimeout(customizeWidget, 100);

    // Also customize when widget opens
    if (window.ShopifyChat) {
      const originalOpen = window.ShopifyChat.open;
      if (originalOpen) {
        window.ShopifyChat.open = function() {
          originalOpen.call(window.ShopifyChat);
          setTimeout(customizeWidget, 200);
        };
      }
    }
  }, [isLoaded, colors, greetingMessage, position]);

  return (
    <>
      {/* Try loader first */}
      <Script
        src={loaderUrl}
        strategy="lazyOnload"
        onLoad={() => {
          setIsLoaded(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Shopify Inbox loader loaded');
            console.log('✅ Checking for window.ShopifyChat...');
            setTimeout(() => {
              console.log('window.ShopifyChat:', window.ShopifyChat);
            }, 2000);
          }
        }}
        onError={(e) => {
          console.error('❌ Failed to load Shopify Inbox loader:', e);
          console.log('⚠️ Loader failed, this might be expected');
        }}
      />
      
      {/* Fallback to direct widget load if loader doesn't work */}
      <Script
        src={`${widgetUrl}?shop=${shopDomain}`}
        strategy="lazyOnload"
        onLoad={() => {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Shopify Inbox widget loaded directly');
          }
        }}
        onError={(e) => {
          console.error('❌ Failed to load Shopify Inbox widget:', e);
        }}
      />
    </>
  );
}
