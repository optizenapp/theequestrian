import { NextRequest, NextResponse } from 'next/server';
import { getSubcategoriesForCollection } from '@/lib/mapping/collection-mapping';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';
import { getMegaMenuContent } from '@/lib/content/mega-menu-content';
import { shopifyFetch } from '@/lib/shopify/client';
import {
  enrichMenuImageItems,
  firstSubcategoryImageUrl,
} from '@/lib/navigation/mega-menu-images';

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

    // Fetch a sample product image for each subcategory using a lightweight
    // direct query — avoids the heavy getProductsByTypes (facets + filters)
    // which can return 0 results when metafields aren't perfectly set.
    const subcategoriesWithImages = await Promise.all(
      subcategories.map(async (subcategory) => {
        try {
          const productTypes = await getProductTypesForCollection(category, subcategory.handle);

          if (productTypes.length === 0) {
            return { ...subcategory, image: null };
          }

          // Build a minimal Shopify product_type query for just 1 product image.
          const typeQuery = productTypes
            .slice(0, 5)
            .map((t) => `product_type:"${t}"`)
            .join(' OR ');

          type ImageNode = { url: string; altText: string | null; width: number; height: number };
          type ProductNode = { images: { edges: Array<{ node: ImageNode }> }; availableForSale: boolean };
          type QueryResult = { products: { edges: Array<{ node: ProductNode }> } };

          const data = await shopifyFetch<QueryResult>({
            query: `query MegaMenuThumb($q: String!) {
              products(first: 5, query: $q) {
                edges {
                  node {
                    availableForSale
                    images(first: 1) {
                      edges { node { url altText width height } }
                    }
                  }
                }
              }
            }`,
            variables: { q: typeQuery },
            cache: 'force-cache',
          });

          // Prefer an in-stock product for the thumbnail
          const nodes = (data.products?.edges ?? []).map((e) => e.node);
          const picked = nodes.find((n) => n.availableForSale) ?? nodes[0];
          const image = picked?.images?.edges?.[0]?.node;

          return {
            ...subcategory,
            image: image
              ? { url: image.url, altText: image.altText || subcategory.label, width: image.width, height: image.height }
              : null,
          };
        } catch (error) {
          console.error(`Error fetching image for ${subcategory.handle}:`, error);
          return { ...subcategory, image: null };
        }
      })
    );

    customQuickLinks = enrichMenuImageItems(customQuickLinks, subcategoriesWithImages, category);
    customSubcategoryCards = enrichMenuImageItems(customSubcategoryCards, subcategoriesWithImages, category);

    const featuredFallbackUrl = firstSubcategoryImageUrl(subcategoriesWithImages);
    if (featuredImage && featuredFallbackUrl) {
      featuredImage = { ...featuredImage, fallbackUrl: featuredFallbackUrl };
    } else if (!featuredImage && featuredFallbackUrl) {
      featuredImage = {
        url: featuredFallbackUrl,
        altText: category,
        width: 1200,
        height: 800,
        productTitle: category.charAt(0).toUpperCase() + category.slice(1),
        subtitle: `Shop ${category}`,
        link: `/${category}`,
      };
    }

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

