/**
 * Utility functions for cart operations
 */

/**
 * Normalize Shopify checkout URL to use proper .myshopify.com domain
 * 
 * For headless storefronts, Shopify's Storefront API returns cart permalink URLs
 * in various formats:
 * - https://www.yourdomain.com/cart/c/[cart-id]?key=[key]
 * - https://checkout.yourdomain.com/cart/c/[cart-id]?key=[key]
 * - https://yourdomain.myshopify.com/cart/c/[cart-id]?key=[key]
 * 
 * These custom domain URLs don't work because they point to your Next.js app, not Shopify's checkout.
 * This function converts ALL custom domain URLs to the proper .myshopify.com format which Shopify can handle.
 * 
 * Shopify will then automatically redirect to your custom checkout domain if configured.
 * 
 * @param checkoutUrl - The checkout URL from Shopify Cart API
 * @returns Normalized checkout URL pointing to .myshopify.com
 */
export function normalizeCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    const shopDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'theequestrian.myshopify.com';
    
    // If it's already on .myshopify.com, return as-is
    if (url.hostname.includes('.myshopify.com')) {
      return checkoutUrl;
    }
    
    // If it's on ANY custom domain (www, checkout, or any other subdomain), convert to .myshopify.com
    // This handles all cases: www.theequestrian.com.au, checkout.theequestrian.com.au, etc.
    if (url.pathname.startsWith('/cart/c/')) {
      // Extract cart ID and key from the permalink
      // Format: /cart/c/[cart-id]?key=[key]
      const pathParts = url.pathname.split('/');
      const cartId = pathParts[pathParts.length - 1]; // Last segment is the cart ID
      const key = url.searchParams.get('key');
      
      // Always convert to .myshopify.com domain
      const normalized = `https://${shopDomain}/cart/c/${cartId}${key ? `?key=${key}` : ''}`;
      
      // Debug logging (remove in production if needed)
      if (process.env.NODE_ENV === 'development') {
        console.log('[normalizeCheckoutUrl]', {
          original: checkoutUrl,
          normalized,
          hostname: url.hostname,
          pathname: url.pathname,
        });
      }
      
      return normalized;
    }
    
    // If it's a different path format, still convert the domain
    const normalized = checkoutUrl.replace(url.hostname, shopDomain);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[normalizeCheckoutUrl] Domain converted:', {
        original: checkoutUrl,
        normalized,
      });
    }
    
    return normalized;
    
  } catch (error) {
    console.error('Error normalizing checkout URL:', error, checkoutUrl);
    // Return original URL if parsing fails
    return checkoutUrl;
  }
}
