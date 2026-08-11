'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ShopifyCart } from '@/types/shopify';
import { createCart, addToCart, updateCart, removeFromCart, getCart, setCartCookie } from '@/app/actions/cart';
import { readSdAttrPayload, syncPerformCartAttribute } from '@/lib/analytics/perform';

interface CartContextType {
  cart: ShopifyCart | null;
  isOpen: boolean;
  isLoading: boolean;
  addCartItem: (variantId: string, quantity: number) => Promise<ShopifyCart>;
  updateCartItem: (lineId: string, quantity: number) => Promise<void>;
  removeCartItem: (lineId: string) => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      const cartId = localStorage.getItem('cartId');
      if (cartId) {
        const existingCart = await getCart(cartId);
        if (existingCart) {
          setCart(existingCart);
          // Sync cart ID to cookie for server-side access
          await setCartCookie(cartId);
          // Re-render server components (e.g. /cart recommendations)
          // so they can use the synced cart cookie immediately.
          router.refresh();
        } else {
          // Cart doesn't exist anymore, remove from localStorage
          localStorage.removeItem('cartId');
        }
      }
    };

    loadCart();
  }, []);

  const addCartItem = async (variantId: string, quantity: number) => {
    setIsLoading(true);
    try {
      let updatedCart: ShopifyCart;

      if (cart?.id) {
        // Add to existing cart
        updatedCart = await addToCart(cart.id, [{ merchandiseId: variantId, quantity }]);
      } else {
        // Create new cart with Perform attribution when available
        const sdAttr = readSdAttrPayload();
        const attributes = sdAttr ? [{ key: '_sd_attr', value: sdAttr }] : undefined;
        updatedCart = await createCart([{ merchandiseId: variantId, quantity }], attributes);
        localStorage.setItem('cartId', updatedCart.id);
        // Cookie is already set by createCart server action
      }

      setCart(updatedCart);
      void syncPerformCartAttribute(updatedCart.id);
      
      // Refresh server components to update recommendations on cart page
      router.refresh();
      
      return updatedCart;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCartItem = async (lineId: string, quantity: number) => {
    if (!cart?.id) return;

    setIsLoading(true);
    try {
      const updatedCart = await updateCart(cart.id, [{ id: lineId, quantity }]);
      setCart(updatedCart);
      void syncPerformCartAttribute(updatedCart.id);
      
      // Refresh server components to update recommendations
      router.refresh();
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeCartItem = async (lineId: string) => {
    if (!cart?.id) return;

    setIsLoading(true);
    try {
      const updatedCart = await removeFromCart(cart.id, [lineId]);
      setCart(updatedCart);
      void syncPerformCartAttribute(updatedCart.id);
      
      // Refresh server components to update recommendations
      router.refresh();
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        isLoading,
        addCartItem,
        updateCartItem,
        removeCartItem,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}











