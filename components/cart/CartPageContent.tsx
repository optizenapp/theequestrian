'use client';

import { useCart } from './cart-context';
import Image from 'next/image';
import Link from 'next/link';
import { TrustSignals } from '@/components/TrustSignals';
import { useState } from 'react';

// Placeholder products for "Complete your cart"
const recommendedProducts = [
  {
    id: 'rec1',
    title: 'Premium Leather Care Kit',
    price: 49.95,
    image: 'https://images.unsplash.com/photo-1544082593-2b9845302954?auto=format&fit=crop&w=300&q=80',
    rating: 4.8
  },
  {
    id: 'rec2',
    title: 'Equestrian Riding Socks',
    price: 19.95,
    image: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=300&q=80',
    rating: 4.7
  },
  {
    id: 'rec3',
    title: 'Horse Treats - Apple Flavor',
    price: 14.95,
    image: 'https://images.unsplash.com/photo-1534361960057-19889db9621e?auto=format&fit=crop&w=300&q=80',
    rating: 4.9
  }
];

export function CartPageContent() {
  const { cart, updateCartItem, removeCartItem } = useCart();
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);

  const itemCount = cart?.totalQuantity || 0;
  const subtotal = parseFloat(cart?.cost.subtotalAmount.amount || '0');
  const currencyCode = cart?.cost.subtotalAmount.currencyCode || 'AUD';
  
  // Placeholder fees for demonstration to match layout
  const qualityAssuranceFee = 5.99;
  const shippingCost = 0; // Free
  const total = subtotal + qualityAssuranceFee + shippingCost;

  // Date for delivery estimate (e.g., 3-5 days from now)
  const deliveryDateStart = new Date();
  deliveryDateStart.setDate(deliveryDateStart.getDate() + 3);
  const deliveryDateEnd = new Date();
  deliveryDateEnd.setDate(deliveryDateEnd.getDate() + 5);
  const deliveryOptions = { month: 'short', day: 'numeric' } as const;
  const deliveryString = `${deliveryDateStart.toLocaleDateString('en-US', deliveryOptions)} - ${deliveryDateEnd.toLocaleDateString('en-US', deliveryOptions)}`;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-8 text-gray-900">Your cart</h1>

        {!cart || cart.lines.edges.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-lg shadow-sm">
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
                  // Mock "Compare At" price for savings demo (10% more)
                  const compareAtPrice = price * 1.1;
                  const savings = compareAtPrice - price;

                  return (
                    <div key={line.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* Image Section */}
                        <div className="relative w-full sm:w-32 h-32 flex-shrink-0">
                          {image && (
                            <div className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
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
                              {/* Condition Badge - Mocked to match design */}
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium border border-gray-300 text-gray-600">
                                Excellent
                              </span>
                              
                              <h3 className="text-base font-bold text-gray-900 leading-tight">
                                <Link href={`/products/${product.handle}`} className="hover:underline">
                                  {product.title}
                                </Link>
                              </h3>
                              
                              <div className="text-sm text-gray-500">
                                {line.merchandise.title !== 'Default Title' && (
                                  <p className="mb-1">{line.merchandise.title}</p>
                                )}
                              </div>

                              {/* Delivery Info */}
                              <div className="text-sm">
                                <p className="text-gray-900">Get it by <span className="font-medium">{deliveryString}</span> • Free</p>
                                <p className="text-gray-500 text-xs mt-0.5">Express available at checkout</p>
                              </div>
                            </div>

                            {/* Price Section */}
                            <div className="text-right space-y-1">
                              <p className="text-xl font-bold text-gray-900">
                                ${price.toFixed(2)}
                              </p>
                              {savings > 0 && (
                                <>
                                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs font-medium">
                                    <span>Save ${savings.toFixed(2)}</span>
                                  </div>
                                  <p className="text-xs text-gray-400 line-through">
                                    ${compareAtPrice.toFixed(2)} new
                                  </p>
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

              {/* Complete Your Cart Section */}
              <div className="pt-8 border-t border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Complete your cart:</h2>
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
                  {recommendedProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow group cursor-pointer">
                      <div className="relative aspect-square mb-4 bg-gray-50 rounded-lg overflow-hidden">
                         <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">{product.title}</h3>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">${product.price.toFixed(2)}</span>
                      </div>
                      <button className="w-full mt-3 bg-white border border-gray-300 text-gray-900 py-2 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
                        Add to cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perks Section */}
              <div className="pt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your perks with every purchase:</h2>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <TrustSignals />
                </div>
              </div>
            </div>

            {/* Right Column: Summary Sidebar */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-6">Summary</h2>
                
                {/* Mini Cart Items */}
                <div className="flex -space-x-2 overflow-hidden mb-6 pb-6 border-b border-gray-100">
                  {cart.lines.edges.slice(0, 4).map(({ node: line }) => {
                    const image = line.merchandise.product?.images.edges[0]?.node;
                    return (
                      <div key={line.id} className="relative w-12 h-12 rounded-lg border-2 border-white shadow-sm bg-gray-50 flex-shrink-0 overflow-hidden">
                         {image && (
                            <Image
                              src={image.url}
                              alt={line.merchandise.product.title}
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
                    <div className="relative w-12 h-12 rounded-lg border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
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
                    <span className="text-green-600 font-medium">Free</span>
                  </div>
                  <div className="flex justify-between group relative">
                    <span className="border-b border-dotted border-gray-400 cursor-help">Quality Assurance Fee</span>
                    <span>${qualityAssuranceFee.toFixed(2)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-end border-t border-gray-100 pt-4 mb-6">
                  <div>
                    <span className="text-lg font-bold text-gray-900">Total including GST</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
                </div>

                {/* Checkout Button */}
                <a
                  href={cart.checkoutUrl}
                  className="block w-full bg-action text-white text-center py-4 rounded-full font-bold text-lg hover:bg-action-hover hover:shadow-lg transition-all mb-4 transform active:scale-[0.99]"
                >
                  Go to shipping
                </a>

                {/* Legal / Trust */}
                <div className="text-xs text-gray-500 text-center mb-4">
                  By confirming this order, you accept our <Link href="/terms" className="underline text-gray-700">Terms of Service</Link>, <Link href="/agreement" className="underline text-gray-700">Agreement</Link> and our <Link href="/privacy" className="underline text-gray-700">Data protection policy</Link>.
                </div>

                {/* Payment Methods */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex justify-center gap-2 opacity-75 grayscale hover:grayscale-0 transition-all">
                   {/* Simple placeholders for payment icons using text or basic svgs if images aren't available */}
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center text-[8px] font-bold text-blue-800 italic">VISA</div>
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center text-[8px] font-bold text-red-600">MC</div>
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center text-[8px] font-bold text-blue-500">AMEX</div>
                   <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center text-[8px] font-bold text-blue-600">PayPal</div>
                   <div className="text-[10px] flex items-center gap-1 ml-2 text-gray-500 font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                      Secure payment
                   </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
