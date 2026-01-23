/**
 * Programmatic control utilities for Shopify Inbox chat widget
 * 
 * These functions provide a type-safe way to interact with the Shopify Chat widget
 * from anywhere in your application.
 */

/**
 * Opens the Shopify Inbox chat widget
 * 
 * @example
 * ```tsx
 * import { openShopifyChat } from '@/lib/chat/inbox-controls';
 * 
 * <button onClick={openShopifyChat}>
 *   Chat with us
 * </button>
 * ```
 */
export function openShopifyChat(): void {
  if (typeof window === 'undefined') {
    console.warn('openShopifyChat: window is not available (server-side)');
    return;
  }

  if (!window.ShopifyChat) {
    console.warn('Shopify Chat widget not loaded yet. Please wait for the script to load.');
    return;
  }

  try {
    window.ShopifyChat.open();
  } catch (error) {
    console.error('Failed to open Shopify Chat:', error);
  }
}

/**
 * Closes the Shopify Inbox chat widget
 * 
 * @example
 * ```tsx
 * import { closeShopifyChat } from '@/lib/chat/inbox-controls';
 * 
 * <button onClick={closeShopifyChat}>
 *   Close chat
 * </button>
 * ```
 */
export function closeShopifyChat(): void {
  if (typeof window === 'undefined') {
    console.warn('closeShopifyChat: window is not available (server-side)');
    return;
  }

  if (!window.ShopifyChat) {
    console.warn('Shopify Chat widget not loaded yet.');
    return;
  }

  try {
    window.ShopifyChat.close();
  } catch (error) {
    console.error('Failed to close Shopify Chat:', error);
  }
}

/**
 * Toggles the Shopify Inbox chat widget open/closed state
 * 
 * @example
 * ```tsx
 * import { toggleShopifyChat } from '@/lib/chat/inbox-controls';
 * 
 * <button onClick={toggleShopifyChat}>
 *   Toggle chat
 * </button>
 * ```
 */
export function toggleShopifyChat(): void {
  if (typeof window === 'undefined') {
    console.warn('toggleShopifyChat: window is not available (server-side)');
    return;
  }

  if (!window.ShopifyChat) {
    console.warn('Shopify Chat widget not loaded yet.');
    return;
  }

  try {
    if (window.ShopifyChat.toggle) {
      window.ShopifyChat.toggle();
    } else {
      // Fallback: check if open and toggle manually
      const isOpen = window.ShopifyChat.isOpen?.() ?? false;
      if (isOpen) {
        window.ShopifyChat.close();
      } else {
        window.ShopifyChat.open();
      }
    }
  } catch (error) {
    console.error('Failed to toggle Shopify Chat:', error);
  }
}

/**
 * Checks if the Shopify Chat widget is currently open
 * 
 * @returns true if chat is open, false otherwise
 */
export function isShopifyChatOpen(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!window.ShopifyChat) {
    return false;
  }

  try {
    return window.ShopifyChat.isOpen?.() ?? false;
  } catch (error) {
    console.error('Failed to check Shopify Chat state:', error);
    return false;
  }
}

/**
 * Checks if the Shopify Chat widget is loaded and available
 * 
 * @returns true if widget is loaded, false otherwise
 */
export function isShopifyChatLoaded(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return typeof window.ShopifyChat !== 'undefined';
}

/**
 * Waits for the Shopify Chat widget to load
 * 
 * @param timeout Maximum time to wait in milliseconds (default: 10000)
 * @returns Promise that resolves when widget is loaded, or rejects on timeout
 */
export function waitForShopifyChat(timeout: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('window is not available'));
      return;
    }

    if (window.ShopifyChat) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.ShopifyChat) {
        clearInterval(checkInterval);
        resolve();
        return;
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('Shopify Chat widget failed to load within timeout'));
      }
    }, 100);
  });
}
