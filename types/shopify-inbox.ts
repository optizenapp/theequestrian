/**
 * TypeScript definitions for Shopify Inbox Chat API
 * 
 * These types are based on the Shopify Chat widget API.
 * The actual API methods may vary - update as needed when testing.
 */

declare global {
  interface Window {
    ShopifyChat?: {
      /**
       * Opens the chat widget
       */
      open: () => void;
      
      /**
       * Closes the chat widget
       */
      close: () => void;
      
      /**
       * Toggles the chat widget open/closed state
       */
      toggle?: () => void;
      
      /**
       * Checks if chat is currently open
       */
      isOpen?: () => boolean;
      
      /**
       * Sends a message programmatically (if supported)
       */
      sendMessage?: (message: string) => void;
      
      /**
       * Sets customer information (if supported)
       */
      setCustomer?: (customer: {
        email?: string;
        name?: string;
        phone?: string;
      }) => void;
    };
  }
}

export {};
