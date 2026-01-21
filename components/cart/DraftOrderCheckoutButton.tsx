'use client';

/**
 * Draft Order Checkout Button
 * 
 * Creates draft order with custom prices (base + shipping)
 * and redirects customer to Shopify invoice for payment
 */

import { useState } from 'react';
import { useCart } from './cart-context';

interface DraftOrderCheckoutButtonProps {
  className?: string;
}

export function DraftOrderCheckoutButton({ className }: DraftOrderCheckoutButtonProps) {
  const { cart } = useCart();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For now, we'll need customer email - you can collect this via:
  // 1. Auth system (if user logged in)
  // 2. Email input field on cart page
  // 3. Modal popup before checkout
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  
  async function handleCheckout() {
    setError(null);
    
    // Validate cart
    if (!cart || cart.lines.edges.length === 0) {
      setError('Your cart is empty');
      return;
    }
    
    // Check if we need email
    if (!email) {
      setShowEmailInput(true);
      return;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Prepare cart items
      const items = cart.lines.edges.map(({ node }) => ({
        variantId: node.merchandise.id,
        quantity: node.quantity,
        price: node.merchandise.price.amount,
        vendor: node.merchandise.product.vendor || 'Unknown',
        tags: node.merchandise.product.tags || [],
        title: node.merchandise.product.title || node.merchandise.title,
        weight: node.merchandise.weight?.value, // Weight in grams (if available)
      }));
      
      console.log('[Checkout] Creating draft order...');
      console.log('[Checkout] Items:', items.length);
      
      // Create draft order
      const response = await fetch('/api/checkout/create-draft-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          customer: {
            email,
          },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout');
      }
      
      console.log('[Checkout] ✅ Draft order created:', data.draftOrderId);
      console.log('[Checkout] Redirecting to invoice...');
      
      // Redirect to Shopify invoice page
      window.location.href = data.invoiceUrl;
      
    } catch (err) {
      console.error('[Checkout] Error:', err);
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
      setIsCreating(false);
    }
  }
  
  // If email input is not shown, show checkout button
  if (!showEmailInput) {
    return (
      <button
        onClick={handleCheckout}
        disabled={isCreating || !cart || cart.lines.edges.length === 0}
        className={className || "w-full bg-action text-white py-4 rounded-full font-semibold text-lg hover:bg-action-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"}
      >
        {isCreating ? 'Creating Checkout...' : 'Checkout'}
      </button>
    );
  }
  
  // Show email input form
  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="checkout-email" className="block text-sm font-medium text-gray-700 mb-2">
          Email address for order confirmation
        </label>
        <input
          id="checkout-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-action focus:border-action"
          autoFocus
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleCheckout();
            }
          }}
        />
      </div>
      
      <button
        onClick={handleCheckout}
        disabled={isCreating || !email}
        className={className || "w-full bg-action text-white py-4 rounded-full font-semibold text-lg hover:bg-action-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"}
      >
        {isCreating ? 'Creating Checkout...' : 'Continue to Payment'}
      </button>
      
      <button
        onClick={() => {
          setShowEmailInput(false);
          setError(null);
        }}
        className="w-full text-gray-600 text-sm hover:text-gray-800"
      >
        Cancel
      </button>
    </div>
  );
}
