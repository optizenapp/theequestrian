import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductByHandle } from '@/lib/shopify/products';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { generateSimplePageSchema } from '@/lib/utils/site-schema';

export const metadata = {
  title: 'Write a Review | The Equestrian',
  description: 'Share your experience with our products',
};

async function ReviewPageContent({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; order?: string }>;
}) {
  const params = await searchParams;
  const productHandle = params.product;
  const orderId = params.order;

  if (!productHandle) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Write a Review
            </h1>
            <p className="text-gray-600">
              Please provide a product to review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch product details
  const product = await getProductByHandle(productHandle);

  if (!product) {
    notFound();
  }

  const productImage = product.images.edges[0]?.node.url || '';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              Write a Review
            </h1>
            <p className="text-gray-300">
              Share your experience with this product
            </p>
          </div>

          {/* Product Info */}
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              {productImage && (
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={productImage}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {product.title}
                </h2>
                {orderId && (
                  <p className="text-sm text-gray-500 mt-1">
                    Order #{orderId}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Review Form */}
          <div className="px-8 py-6">
            <ReviewForm
              productId={product.id}
              productHandle={productHandle}
              productTitle={product.title}
              orderId={orderId}
            />
          </div>
        </div>

        {/* Guidelines */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            Review Guidelines
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Be honest and authentic in your review</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Focus on the product quality, fit, and performance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Avoid profanity or inappropriate content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Reviews are moderated and may take 24-48 hours to appear</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; order?: string }>;
}) {
  const schema = generateSimplePageSchema(
    '/review',
    'Write a Review | The Equestrian',
    'Share your experience with products purchased from The Equestrian.'
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-2xl mx-auto px-4">
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <ReviewPageContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

