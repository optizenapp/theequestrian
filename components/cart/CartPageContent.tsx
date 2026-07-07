'use client';

import { useCart } from './cart-context';
import Image from 'next/image';
import Link from 'next/link';
import { TrustSignals } from '@/components/TrustSignals';
import { useEffect, useRef, useState } from 'react';
import { FaCcVisa, FaCcMastercard, FaCcPaypal } from 'react-icons/fa';
import { SiAfterpay, SiShopify } from 'react-icons/si';
import { ShopifyProduct } from '@/types/shopify';
import { normalizeCheckoutUrl } from '@/lib/shopify/cart-utils';
import { trackGaEvent } from '@/lib/analytics/ga4';
import {
  bindDecoratedCheckoutLink,
} from '@/lib/analytics/ga4-linker';

interface CartPageContentProps {
  recommendedProducts?: ShopifyProduct[];
  /** Storefront paths by handle (from getCanonicalHrefByHandles on the server). */
  productHrefByHandle?: Record<string, string>;
}

export function CartPageContent({
  recommendedProducts = [],
  productHrefByHandle = {},
}: CartPageContentProps) {
  const hrefFor = (handle: string) => productHrefByHandle[handle] ?? `/products/${handle}`;
  const { cart, addCartItem, updateCartItem, removeCartItem } = useCart();
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  const checkoutLinkRef = useRef<HTMLAnchorElement | null>(null);

  const itemCount = cart?.totalQuantity || 0;
  
  // Subtotal from cart line prices; shipping is calculated at Shopify checkout.
  const subtotal = cart?.lines.edges.reduce((total, { node: line }) => {
    const price = parseFloat(line.merchandise.price.amount);
    return total + (price * line.quantity);
  }, 0) || 0;
  
  const currencyCode = cart?.cost.subtotalAmount.currencyCode || 'AUD';
  const total = subtotal;

  // Date for delivery estimate (e.g., 3-5 days from now)
  const deliveryDateStart = new Date();
  deliveryDateStart.setDate(deliveryDateStart.getDate() + 3);
  const deliveryDateEnd = new Date();
  deliveryDateEnd.setDate(deliveryDateEnd.getDate() + 5);
  const deliveryOptions = { month: 'short', day: 'numeric' } as const;
  const deliveryString = `${deliveryDateStart.toLocaleDateString('en-US', deliveryOptions)} - ${deliveryDateEnd.toLocaleDateString('en-US', deliveryOptions)}`;

  const checkoutHref =
    cart && cart.lines.edges.length > 0
      ? normalizeCheckoutUrl(cart.checkoutUrl)
      : '';

  useEffect(() => {
    const link = checkoutLinkRef.current;
    if (!link || !checkoutHref || !cart) return;

    return bindDecoratedCheckoutLink(link, {
      source: 'cart_page',
      onPlainLeftClick: () =>
        trackGaEvent('begin_checkout', {
          currency: cart.cost.totalAmount.currencyCode,
          value: total,
          item_count: cart.totalQuantity,
          source: 'cart_page',
        }),
    });
  }, [cart, checkoutHref, total]);

  const handleAddRecommendation = async (product: ShopifyProduct) => {
    // Get the first variant ID
    const firstVariantId = product.variants.edges[0]?.node.id;
    if (!firstVariantId) return;

    setAddingToCartId(product.id);
    try {
      await addCartItem(firstVariantId, 1);
    } catch (error) {
      console.error('Failed to add recommendation to cart', error);
    } finally {
      setAddingToCartId(null);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Your cart</h1>

        {!cart || cart.lines.edges.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl shadow-sm">
            <p className="text-xl text-gray-600 mb-6">Your cart is empty</p>
            <Link
              href="/"
              className="inline-block bg-action text-white px-8 py-3 rounded-full font-semibold hover:bg-action-hover transition-all hover:shadow-md"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Cart Items & Recommendations */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Cart Items List */}
              <div className="space-y-4">
                {cart.lines.edges.map(({ node: line }) => {
                  const product = line.merchandise.product;
                  const image = product?.images.edges[0]?.node;
                  const price = parseFloat(line.merchandise.price.amount);
                  const compareAtRaw = line.merchandise.compareAtPrice?.amount;
                  const compareAtPrice = compareAtRaw ? parseFloat(compareAtRaw) : null;
                  const savings = compareAtPrice !== null && compareAtPrice > price ? compareAtPrice - price : 0;

                  return (
                    <div key={line.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* Image Section */}
                        <div className="relative w-full sm:w-32 h-32 flex-shrink-0">
                          {image && (
                            <div className="relative w-full h-full bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                              <Image
                                src={image.url}
                                alt={image.altText || product.title}
                                fill
                                className="object-contain p-2"
                              />
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2">
                              
                              <h3 className="text-base font-bold text-gray-900 leading-tight">
                                {product && (
                                  <Link href={hrefFor(product.handle)} className="hover:underline">
                                    {product.title}
                                  </Link>
                                )}
                                {!product && <span className="text-gray-900">{line.merchandise.title}</span>}
                              </h3>
                              
                              <div className="text-sm text-gray-500">
                                {line.merchandise.title !== 'Default Title' && (
                                  <p className="mb-1">{line.merchandise.title}</p>
                                )}
                              </div>

                              {/* Express Shipping Badge */}
                              <div className="text-sm">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-1 rounded" style={{ backgroundColor: '#bd7ab3' }}>
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                  </svg>
                                  Express available at checkout
                                </span>
                              </div>
                            </div>

                            {/* Price Section */}
                            <div className="text-right space-y-1">
                              <p className="text-xl font-bold text-gray-900">
                                ${price.toFixed(2)}
                              </p>
                              {savings > 0 && compareAtPrice !== null && (
                                <>
                                  <p className="text-xs text-gray-400 line-through">
                                    ${compareAtPrice.toFixed(2)}
                                  </p>
                                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-medium">
                                    <span>Save ${savings.toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Controls Row */}
                          <div className="flex justify-between items-center mt-6">
                            {/* Quantity Selector */}
                            <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-200">
                              <button
                                onClick={() => {
                                  if (line.quantity > 1) updateCartItem(line.id, line.quantity - 1);
                                }}
                                disabled={line.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:shadow-none text-gray-600"
                              >
                                −
                              </button>
                              <span className="w-8 text-center font-semibold text-sm">{line.quantity}</span>
                              <button
                                onClick={() => updateCartItem(line.id, line.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-600"
                              >
                                +
                              </button>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => removeCartItem(line.id)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium border border-red-200 rounded-lg px-4 py-1.5 hover:bg-red-50 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Want These In Your Cart Too Section */}
              {recommendedProducts.length > 0 && (
                <div className="pt-8 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Want These In Your Cart Too?</h2>
                    <div className="flex gap-2">
                      <button 
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        onClick={() => setShowAllRecommendations(false)}
                        disabled={!showAllRecommendations}
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button 
                        className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                        onClick={() => setShowAllRecommendations(true)}
                        disabled={showAllRecommendations}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {recommendedProducts.slice(0, 3).map((product) => {
// Skip if already in cart
const isInCart = cart.lines.edges.some(line => line.node.merchandise.product?.handle === product.handle);
if (isInCart) return null;

                      const image = product.images.edges[0]?.node;
                      const price = parseFloat(product.priceRange.minVariantPrice.amount);
                      
                      return (
                        <div key={product.id} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow group cursor-pointer h-full flex flex-col">
                          <div className="relative aspect-square mb-4 bg-gray-50 rounded-xl overflow-hidden">
                             {image && (
                               <Image
                                  src={image.url}
                                  alt={image.altText || product.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                             )}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 flex-grow">
                            <Link href={hrefFor(product.handle)} className="hover:underline">
                              {product.title}
                            </Link>
                          </h3>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-bold text-sm">${price.toFixed(2)}</span>
                          </div>
                          <button 
                            className="w-full mt-3 bg-white border border-gray-300 text-gray-900 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                            onClick={() => handleAddRecommendation(product)}
                            disabled={addingToCartId === product.id}
                          >
                            {addingToCartId === product.id ? 'Adding...' : 'Add to cart'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Perks Section */}
              <div className="pt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your perks with every purchase:</h2>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <TrustSignals />
                </div>
              </div>
            </div>

            {/* Right Column: Summary Sidebar */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-6">Summary</h2>
                
                {/* Mini Cart Items */}
                <div className="flex -space-x-2 overflow-hidden mb-6 pb-6 border-b border-gray-100">
                  {cart.lines.edges.slice(0, 4).map(({ node: line }) => {
                    const image = line.merchandise.product?.images.edges[0]?.node;
                    return (
                      <div key={line.id} className="relative w-12 h-12 rounded-xl border-2 border-white shadow-sm bg-gray-50 flex-shrink-0 overflow-hidden">
                          {image && (
                            <Image
                              src={image.url}
                              alt={line.merchandise.product?.title || line.merchandise.title}
                              fill
                              className="object-cover"
                            />
                          )}
                          {line.quantity > 1 && (
                            <span className="absolute top-0 right-0 bg-gray-900 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-bl-lg">
                              {line.quantity}
                            </span>
                          )}
                      </div>
                    );
                  })}
                  {cart.lines.edges.length > 4 && (
                    <div className="relative w-12 h-12 rounded-xl border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      +{cart.lines.edges.length - 4}
                    </div>
                  )}
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3 text-sm text-gray-600 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-gray-700 font-medium">Calculated at checkout</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-end border-t border-gray-100 pt-4 mb-6">
                  <div>
                    <span className="text-lg font-bold text-gray-900">Total including GST</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                </div>

                {/* Checkout Button - Standard Shopify Checkout */}
                <a
                  ref={checkoutLinkRef}
                  href={checkoutHref}
                  className="block w-full bg-action text-white text-center py-4 rounded-full font-bold text-lg hover:bg-action-hover hover:shadow-lg transition-all mb-4 transform active:scale-[0.99]"
                >
                  Checkout
                </a>

                {/* Legal / Trust */}
                <div className="text-xs text-gray-500 text-center mb-4">
                  By confirming this order, you accept our <Link href="/terms" className="underline text-gray-700">Terms of Service</Link>, <Link href="/agreement" className="underline text-gray-700">Agreement</Link> and our <Link href="/privacy" className="underline text-gray-700">Data protection policy</Link>.
                </div>

                {/* Payment Methods */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex justify-center items-center gap-2 transition-all">
                   {/* Visa */}
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="Visa">
                     <FaCcVisa className="text-[#1A1F71] text-2xl" />
                   </div>
                   
                   {/* Shop Pay */}
                   <div className="h-6 w-10 bg-[#5A31F4] border border-gray-200 rounded flex items-center justify-center" title="Shop Pay">
                     <SiShopify className="text-white text-xl" />
                   </div>
                   
                   {/* Mastercard */}
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="Mastercard">
                     <FaCcMastercard className="text-[#EB001B] text-2xl" />
                   </div>
                   
                   {/* PayPal */}
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="PayPal">
                     <FaCcPaypal className="text-[#003087] text-2xl" />
                   </div>
                   
                   {/* Afterpay - Adjusted size */}
                   <div className="h-6 w-10 bg-[#b2fce4] border border-gray-200 rounded flex items-center justify-center" title="Afterpay">
                     <SiAfterpay className="text-black text-lg" />
                   </div>
                   
                   {/* Zip - Image from public/zip.png */}
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center p-0.5 overflow-hidden" title="Zip">
                     <Image src="/zip.png" alt="Zip Pay" width={40} height={24} className="h-full w-auto object-contain" />
                   </div>
                   
                   <div className="text-[10px] flex items-center gap-1 ml-1 text-gray-500 font-medium border-l pl-3 border-gray-300 h-6">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      Secure payment
                   </div>
                </div>
                <div className="mx-auto mt-3 w-full max-w-[132px] rounded-md border border-gray-200 overflow-hidden bg-white">
                  <Image
                    src="/google top quality store.jpg"
                    alt="Google Top Quality Store"
                    width={420}
                    height={112}
                    className="w-full h-auto object-contain"
                    priority={false}
                  />
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
