'use client';

import { useCart } from './cart-context';
import Image from 'next/image';
import Link from 'next/link';
import { normalizeCheckoutUrl } from '@/lib/shopify/cart-utils';
import { trackGaEvent } from '@/lib/analytics/ga4';
import { FaCcVisa, FaCcMastercard, FaCcPaypal } from 'react-icons/fa';
import { SiAfterpay, SiShopify } from 'react-icons/si';

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateCartItem, removeCartItem } = useCart();

  if (!isOpen) return null;

  const itemCount = cart?.totalQuantity || 0;
  const subtotal = cart?.cost.subtotalAmount.amount || '0';
  const currencyCode = cart?.cost.subtotalAmount.currencyCode || 'AUD';

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-2xl font-bold">Cart ({itemCount})</h2>
          <button
            onClick={closeCart}
            className="text-gray-500 hover:text-gray-700 text-2xl"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {!cart || cart.lines.edges.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
              <button
                onClick={closeCart}
                className="text-action hover:underline transition-colors"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.lines.edges.map(({ node: line }) => {
                const product = line.merchandise.product;
                const image = product?.images.edges[0]?.node;

                return (
                  <div key={line.id} className="flex gap-4 border-b pb-4">
                    {/* Product Image */}
                    {image && product && (
                      <Link href={`/products/${product.handle}`} onClick={closeCart}>
                        <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={image.url}
                            alt={image.altText || product.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </Link>
                    )}

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      {product && (
                        <Link
                          href={`/products/${product.handle}`}
                          onClick={closeCart}
                          className="font-semibold hover:text-action transition-colors line-clamp-2"
                        >
                          {product.title}
                        </Link>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {line.merchandise.title !== 'Default Title' && line.merchandise.title}
                      </p>
                      <p className="text-lg font-semibold mt-2">
                        ${parseFloat(line.merchandise.price.amount).toFixed(2)} {line.merchandise.price.currencyCode}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center border rounded-full overflow-hidden">
                          <button
                            onClick={() => {
                              if (line.quantity > 1) {
                                updateCartItem(line.id, line.quantity - 1);
                              }
                            }}
                            className="px-3 py-1 hover:bg-gray-100 transition-colors"
                            disabled={line.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="px-4 py-1 border-x">{line.quantity}</span>
                          <button
                            onClick={() => updateCartItem(line.id, line.quantity + 1)}
                            className="px-3 py-1 hover:bg-gray-100 transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeCartItem(line.id)}
                          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.lines.edges.length > 0 && (
          <div className="border-t p-6 space-y-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>${parseFloat(subtotal).toFixed(2)} {currencyCode}</span>
            </div>
            <p className="text-sm text-gray-600">
              Shipping and taxes calculated at checkout
            </p>
            <a
              href={normalizeCheckoutUrl(cart.checkoutUrl)}
              onClick={() =>
                trackGaEvent('begin_checkout', {
                  currency: currencyCode,
                  value: parseFloat(subtotal),
                  item_count: itemCount,
                  source: 'cart_drawer',
                })
              }
              className="block w-full bg-action text-white text-center py-3 rounded-full font-semibold hover:bg-action-hover hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              Checkout
            </a>
            <div className="border border-gray-200 rounded-lg p-2 bg-gray-50 flex justify-center items-center gap-1.5 flex-wrap transition-all">
              <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="Visa">
                <FaCcVisa className="text-[#1A1F71] text-2xl" />
              </div>
              <div className="h-6 w-10 bg-[#5A31F4] border border-gray-200 rounded flex items-center justify-center" title="Shop Pay">
                <SiShopify className="text-white text-xl" />
              </div>
              <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="Mastercard">
                <FaCcMastercard className="text-[#EB001B] text-2xl" />
              </div>
              <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center" title="PayPal">
                <FaCcPaypal className="text-[#003087] text-2xl" />
              </div>
              <div className="h-6 w-10 bg-[#b2fce4] border border-gray-200 rounded flex items-center justify-center" title="Afterpay">
                <SiAfterpay className="text-black text-lg" />
              </div>
              <div className="h-6 w-10 bg-white border border-gray-200 rounded flex items-center justify-center p-0.5 overflow-hidden" title="Zip">
                <Image src="/zip.png" alt="Zip Pay" width={40} height={24} className="h-full w-auto object-contain" />
              </div>
              <div className="text-[10px] flex items-center gap-1 text-gray-500 font-medium border-l pl-2 border-gray-300 h-6">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                Secure payment
              </div>
            </div>
            <div className="mx-auto w-full max-w-[108px] rounded-md border border-gray-200 overflow-hidden bg-white">
              <Image
                src="/google top quality store.jpg"
                alt="Google Top Quality Store"
                width={420}
                height={112}
                className="w-full h-auto object-contain"
                priority={false}
              />
            </div>
            <Link
              href="/cart"
              onClick={closeCart}
              className="block w-full text-center py-3 text-action hover:underline transition-colors"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

