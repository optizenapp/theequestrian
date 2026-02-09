import { NextRequest, NextResponse } from 'next/server';
import { getSubcategoriesForCollection } from '@/lib/mapping/collection-mapping';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';
import { getProductsByTypes } from '@/lib/shopify/products';
import { getMegaMenuContent } from '@/lib/content/mega-menu-content';

/**
 * API Route: Get subcategories with sample product images + featured hero image
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
    const subcategories = await getSubcategoriesForCollection(category);

    // Check for custom content from database
    const customContent = await getMegaMenuContent(category);
    
    // Featured image (from CSV or fallback to auto-generated)
    let featuredImage = null;
    let customQuickLinks = null;
    let customSubcategoryCards = null;
    
    if (customContent?.featuredImage) {
      // Use custom featured image from CSV
      featuredImage = {
        url: customContent.featuredImage.url,
        altText: customContent.featuredImage.title,
        width: 1200,
        height: 800,
        productTitle: customContent.featuredImage.title,
        subtitle: customContent.featuredImage.subtitle,
        link: customContent.featuredImage.link,
      };
    }
    
    if (customContent?.quickLinks) {
      // Use custom quick links from CSV
      customQuickLinks = customContent.quickLinks;
    }
    
    if (customContent?.subcategoryCards) {
      // Use custom subcategory cards from CSV (overrides auto-generated)
      customSubcategoryCards = customContent.subcategoryCards;
    }

    // Fetch a sample product image for each subcategory
    const subcategoriesWithImages = await Promise.all(
      subcategories.map(async (subcategory) => {
        try {
          // Get product types for this subcategory
          const productTypes = await getProductTypesForCollection(category, subcategory.handle);
          
          if (productTypes.length === 0) {
            return {
              ...subcategory,
              image: null,
            };
          }

          // Fetch just 1 product to get a sample image
          // Filter by category/subcategory to ensure we get a product from the right category
          const { products } = await getProductsByTypes(
            productTypes, 
            1,
            null,
            undefined,
            {
              category,
              subcategory: subcategory.handle
            }
          );
          
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
      featuredImage,
      customQuickLinks,
      customSubcategoryCards,
    });
  } catch (error) {
    console.error('Error in /api/mapping/subcategories-with-images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}

