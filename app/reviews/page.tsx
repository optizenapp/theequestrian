import type { Metadata } from 'next';
import Link from 'next/link';
import { ReviewStars } from '@/components/reviews/ReviewStars';
import ReviewsPageClient from '@/components/reviews/ReviewsPageClient';
import { getPublicReviews } from '@/lib/reviews/public-reviews';
import { generateSimplePageSchema } from '@/lib/utils/site-schema';

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au'
).replace(/\/$/, '');

export const metadata: Metadata = {
  title: 'Customer Reviews | The Equestrian',
  description:
    'Browse verified customer reviews for products available on The Equestrian.',
  alternates: {
    canonical: `${siteUrl}/reviews`,
  },
  openGraph: {
    title: 'Customer Reviews | The Equestrian',
    description:
      'Browse verified customer reviews for products available on The Equestrian.',
    url: `${siteUrl}/reviews`,
    siteName: 'The Equestrian',
    type: 'website',
  },
};

export default async function ReviewsPage() {
  const { reviews, productHrefByHandle } = await getPublicReviews();
  const schema = generateSimplePageSchema(
    '/reviews',
    'Customer Reviews | The Equestrian',
    'Browse verified customer reviews for products available on The Equestrian.'
  );
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fourStarCount = reviews.filter(r => r.rating === 4).length;
  const threeStarCount = reviews.filter(r => r.rating === 3).length;
  const twoStarCount = reviews.filter(r => r.rating === 2).length;
  const oneStarCount = reviews.filter(r => r.rating === 1).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Customer Reviews</h1>
            <p className="text-xl text-gray-300 mb-8">
              See what our customers are saying about our products
            </p>
            
            {/* Overall Stats */}
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div>
                <div className="text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
                <ReviewStars rating={averageRating} size="lg" />
                <p className="text-gray-300 mt-2">{totalReviews} reviews</p>
              </div>
              <div className="text-left">
                {[
                  { stars: 5, count: fiveStarCount },
                  { stars: 4, count: fourStarCount },
                  { stars: 3, count: threeStarCount },
                  { stars: 2, count: twoStarCount },
                  { stars: 1, count: oneStarCount },
                ].map(({ stars, count }) => (
                  <div key={stars} className="flex items-center gap-2 mb-1">
                    <span className="text-sm w-12">{stars} {stars === 1 ? 'star' : 'stars'}</span>
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-action"
                        style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-sm w-8">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReviewsPageClient
        reviews={reviews}
        productHrefByHandle={productHrefByHandle}
      />

      {/* CTA Section */}
      <div className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Have you purchased from us?
          </h2>
          <p className="text-gray-600 mb-6">
            We'd love to hear about your experience! Your feedback helps other customers make informed decisions.
          </p>
          <Link
            href="/review"
            className="inline-block bg-action text-white px-8 py-3 rounded-full font-semibold hover:-translate-y-0.5 hover:shadow-md transition-all"
          >
            Write a Review
          </Link>
        </div>
      </div>
    </div>
  );
}

