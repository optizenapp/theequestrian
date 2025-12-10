'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ShopifyCart } from '@/types/shopify';
import { createCart, addToCart, updateCart, removeFromCart, getCart } from '@/app/actions/cart';

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
        // Create new cart
        updatedCart = await createCart([{ merchandiseId: variantId, quantity }]);
        localStorage.setItem('cartId', updatedCart.id);
      }

      setCart(updatedCart);
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




