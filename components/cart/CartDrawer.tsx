'use client';

import { useCart } from './cart-context';
import Image from 'next/image';
import Link from 'next/link';

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
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
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
                className="text-[#E91E8C] hover:underline"
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
                          className="font-semibold hover:text-[#E91E8C] line-clamp-2"
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
                        <div className="flex items-center border rounded-lg">
                          <button
                            onClick={() => {
                              if (line.quantity > 1) {
                                updateCartItem(line.id, line.quantity - 1);
                              }
                            }}
                            className="px-3 py-1 hover:bg-gray-100"
                            disabled={line.quantity <= 1}
                          >
                            −
                          </button>
                          <span className="px-4 py-1 border-x">{line.quantity}</span>
                          <button
                            onClick={() => updateCartItem(line.id, line.quantity + 1)}
                            className="px-3 py-1 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeCartItem(line.id)}
                          className="text-sm text-gray-500 hover:text-red-600"
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
              href={cart.checkoutUrl}
              className="block w-full bg-[#E91E8C] text-white text-center py-3 rounded-lg font-semibold hover:bg-[#d01a7d] transition-colors"
            >
              Checkout
            </a>
            <Link
              href="/cart"
              onClick={closeCart}
              className="block w-full text-center py-3 text-[#E91E8C] hover:underline"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

