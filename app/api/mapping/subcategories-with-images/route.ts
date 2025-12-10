import { NextRequest, NextResponse } from 'next/server';
import { getSubcategoriesForCollection } from '@/lib/mapping/collection-mapping';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';
import { getProductsByTypes } from '@/lib/shopify/products';

/**
 * API Route: Get subcategories with sample product images
 * GET /api/mapping/subcategories-with-images?category=horse
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!category) {
      return NextResponse.json(
        { error: 'Category parameter is required' },
        { status: 400 }
      );
    }

    // Get subcategories from mapping
    const subcategories = getSubcategoriesForCollection(category);

    // Fetch a sample product image for each subcategory
    const subcategoriesWithImages = await Promise.all(
      subcategories.map(async (subcategory) => {
        try {
          // Get product types for this subcategory
          const productTypes = getProductTypesForCollection(category, subcategory.handle);
          
          if (productTypes.length === 0) {
            return {
              ...subcategory,
              image: null,
            };
          }

          // Fetch just 1 product to get a sample image
          const { products } = await getProductsByTypes(productTypes, 1);
          
          const sampleProduct = products[0];
          const image = sampleProduct?.images?.edges?.[0]?.node;

          return {
            ...subcategory,
            image: image ? {
              url: image.url,
              altText: image.altText || subcategory.label,
              width: image.width,
              height: image.height,
            } : null,
          };
        } catch (error) {
          console.error(`Error fetching image for ${subcategory.handle}:`, error);
          return {
            ...subcategory,
            image: null,
          };
        }
      })
    );

    return NextResponse.json({
      category,
      subcategories: subcategoriesWithImages,
    });
  } catch (error) {
    console.error('Error in /api/mapping/subcategories-with-images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

