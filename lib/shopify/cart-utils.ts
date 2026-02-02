/**
 * Utility functions for cart operations
 */

/**
 * Normalize Shopify checkout URL for headless storefront
 * 
 * Shopify's Storefront API returns checkout URLs in various formats depending on
 * domain configuration:
 * - https://checkout.yourdomain.com/... (when checkout subdomain is primary - CORRECT)
 * - https://www.yourdomain.com/cart/c/... (when main domain is used - needs conversion)
 * - https://yourdomain.myshopify.com/... (fallback format)
 * 
 * Since checkout.theequestrian.com.au is set as the primary domain in Shopify,
 * URLs on that domain should be left as-is. Only convert URLs on other domains.
 * 
 * @param checkoutUrl - The checkout URL from Shopify Cart API
 * @returns Normalized checkout URL (unchanged if already on checkout domain, converted otherwise)
 */
export function normalizeCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    const shopDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'theequestrian.myshopify.com';
    const checkoutDomain = 'checkout.theequestrian.com.au';
    
    // If it's already on the checkout subdomain (primary domain), return as-is
    // This is the correct domain for checkout
    if (url.hostname === checkoutDomain) {
      return checkoutUrl;
    }
    
    // If Shopify is returning .myshopify.com URLs, convert them to checkout domain
    // This ensures users go to checkout.theequestrian.com.au even if Shopify
    // hasn't updated the URLs yet
    if (url.hostname.includes('.myshopify.com')) {
      // Replace myshopify.com domain with checkout domain
      const normalized = checkoutUrl.replace(url.hostname, checkoutDomain);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[normalizeCheckoutUrl] Converting myshopify.com to checkout domain:', {
          original: checkoutUrl,
          normalized,
        });
      }
      
      return normalized;
    }
    
    // If it's on www.theequestrian.com.au or any other non-checkout domain,
    // convert directly to checkout.theequestrian.com.au
    if (url.pathname.startsWith('/cart/c/')) {
      // Extract cart ID and key from the permalink
      // Format: /cart/c/[cart-id]?key=[key]
      const pathParts = url.pathname.split('/');
      const cartId = pathParts[pathParts.length - 1]; // Last segment is the cart ID
      const key = url.searchParams.get('key');
      
      // Convert directly to checkout domain
      const normalized = `https://${checkoutDomain}/cart/c/${cartId}${key ? `?key=${key}` : ''}`;
      
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log('[normalizeCheckoutUrl] Converting non-checkout domain to checkout domain:', {
          original: checkoutUrl,
          normalized,
          hostname: url.hostname,
        });
      }
      
      return normalized;
    }
    
    // If it's a different path format on a non-checkout domain, convert to checkout domain
    const normalized = checkoutUrl.replace(url.hostname, checkoutDomain);
    
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
