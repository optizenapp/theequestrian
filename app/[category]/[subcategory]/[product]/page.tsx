import { notFound, redirect } from 'next/navigation';
import { getProductByHandle } from '@/lib/shopify/products';
import type { Metadata } from 'next';

interface ProductPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
    product: string;
  }>;
}

/**
 * Product Page: /{category}/{subcategory}/{product}
 * 
 * This route is a legacy/alias URL pattern.
 * It always redirects to the canonical product URL: /products/{handle}
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { product: productHandle } = await params;

  // Verify product exists
  const product = await getProductByHandle(productHandle);

  if (!product) {
    notFound();
  }

  // Always redirect to canonical URL (301 permanent)
  redirect(`/products/${productHandle}`);
}

/**
 * Generate metadata for SEO
 * Note: This won't be used since we redirect, but keeping for completeness
 */
