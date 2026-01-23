'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Debug component to inspect Shopify Inbox widget loading
 */

export function DebugShopifyInbox() {
  const [info, setInfo] = useState<any>({});
  const baseScriptUrl = process.env.NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL;
  const shopDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'theequestrian.myshopify.com';
  
  const scriptUrl = baseScriptUrl?.includes('?') 
    ? `${baseScriptUrl}&shop=${shopDomain}`
    : `${baseScriptUrl}?shop=${shopDomain}`;

  useEffect(() => {
    const checkWidget = setInterval(() => {
      const iframes = document.querySelectorAll('iframe');
      const chatElements = document.querySelectorAll('[id*="chat"], [class*="chat"]');
      
      setInfo({
        scriptUrl,
        shopDomain,
        widgetLoaded: typeof window.ShopifyChat !== 'undefined',
        iframeCount: iframes.length,
        chatElementsCount: chatElements.length,
        iframeSrcs: Array.from(iframes).map(iframe => iframe.src).filter(src => src.includes('shopify')),
      });
    }, 1000);

    return () => clearInterval(checkWidget);
  }, [scriptUrl, shopDomain]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <Script
        src={scriptUrl}
        strategy="lazyOnload"
        onLoad={() => console.log('✅ Script loaded:', scriptUrl)}
        onError={(e) => console.error('❌ Script error:', e)}
      />
      
      <div className="fixed top-4 left-4 z-[9999] bg-black text-white p-4 rounded-lg shadow-lg max-w-md text-xs font-mono">
        <h3 className="font-bold mb-2">Shopify Inbox Debug</h3>
        <pre className="whitespace-pre-wrap overflow-auto max-h-96">
          {JSON.stringify(info, null, 2)}
        </pre>
        <button
          onClick={() => {
            console.log('Window.ShopifyChat:', window.ShopifyChat);
            console.log('All iframes:', document.querySelectorAll('iframe'));
          }}
          className="mt-2 px-2 py-1 bg-blue-600 rounded text-white"
        >
          Log to Console
        </button>
      </div>
    </>
  );
}
