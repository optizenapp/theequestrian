'use client';

import { useCart } from './cart-context';
import Image from 'next/image';
import Link from 'next/link';

export function CartPageContent() {
  const { cart, updateCartItem, removeCartItem } = useCart();

  const itemCount = cart?.totalQuantity || 0;
  const subtotal = cart?.cost.subtotalAmount.amount || '0';
  const currencyCode = cart?.cost.subtotalAmount.currencyCode || 'AUD';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart ({itemCount})</h1>

      {!cart || cart.lines.edges.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-gray-600 mb-6">Your cart is empty</p>
          <Link
            href="/"
            className="inline-block bg-[#E91E8C] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d01a7d] transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cart.lines.edges.map(({ node: line }) => {
              const product = line.merchandise.product;
              const image = product?.images.edges[0]?.node;

              return (
                <div key={line.id} className="flex gap-6 border rounded-lg p-6">
                  {/* Product Image */}
                  {image && product && (
                    <Link href={`/products/${product.handle}`}>
                      <div className="relative w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
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
                  <div className="flex-1">
                    {product && (
                      <Link
                        href={`/products/${product.handle}`}
                        className="text-xl font-semibold hover:text-[#E91E8C] line-clamp-2"
                      >
                        {product.title}
                      </Link>
                    )}
                    <p className="text-gray-600 mt-2">
                      {line.merchandise.title !== 'Default Title' && line.merchandise.title}
                    </p>
                    <p className="text-2xl font-semibold mt-4">
                      ${parseFloat(line.merchandise.price.amount).toFixed(2)} {line.merchandise.price.currencyCode}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4 mt-6">
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => {
                            if (line.quantity > 1) {
                              updateCartItem(line.id, line.quantity - 1);
                            }
                          }}
                          className="px-4 py-2 hover:bg-gray-100"
                          disabled={line.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="px-6 py-2 border-x font-semibold">{line.quantity}</span>
                        <button
                          onClick={() => updateCartItem(line.id, line.quantity + 1)}
                          className="px-4 py-2 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeCartItem(line.id)}
                        className="text-gray-600 hover:text-red-600 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      ${(parseFloat(line.merchandise.price.amount) * line.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="border rounded-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-lg">
                  <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                  <span className="font-semibold">${parseFloat(subtotal).toFixed(2)}</span>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Shipping and taxes calculated at checkout
                  </p>
                </div>
              </div>

              <div className="flex justify-between text-2xl font-bold mb-6 pb-6 border-b">
                <span>Total</span>
                <span>${parseFloat(subtotal).toFixed(2)} {currencyCode}</span>
              </div>

              <a
                href={cart.checkoutUrl}
                className="block w-full bg-[#E91E8C] text-white text-center py-4 rounded-lg font-semibold text-lg hover:bg-[#d01a7d] transition-colors mb-4"
              >
                Proceed to Checkout
              </a>

              <Link
                href="/"
                className="block w-full text-center py-3 text-[#E91E8C] hover:underline"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

