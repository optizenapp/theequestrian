import { NextRequest, NextResponse } from 'next/server';
import { getSubcategoriesForCollection } from '@/lib/mapping/collection-mapping';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';
import { getMegaMenuContent } from '@/lib/content/mega-menu-content';
import { shopifyFetch } from '@/lib/shopify/client';
import {
  buildProductTypeImageQuery,
  enrichMenuImageItems,
  firstSubcategoryImageUrl,
  productTypesForMegaMenuThumb,
  resolveFeaturedImageUrl,
  type MegaMenuThumbImage,
} from '@/lib/navigation/mega-menu-images';

export const dynamic = 'force-dynamic';

type ImageNode = { url: string; altText: string | null; width: number; height: number };
type ProductNode = { images: { edges: Array<{ node: ImageNode }> }; availableForSale: boolean };
type QueryResult = { products: { edges: Array<{ node: ProductNode }> } };

async function fetchThumbForTypes(
  productTypes: string[],
  label: string
): Promise<MegaMenuThumbImage | null> {
  if (productTypes.length === 0) return null;

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
    variables: { q: buildProductTypeImageQuery(productTypes) },
    cache: 'force-cache',
  });

  const nodes = (data.products?.edges ?? []).map((e) => e.node);
  const picked = nodes.find((n) => n.availableForSale) ?? nodes[0];
  const image = picked?.images?.edges?.[0]?.node;
  if (!image?.url) return null;

  return {
    url: image.url,
    altText: image.altText || label,
    width: image.width,
    height: image.height,
  };
}

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

    const subcategories = await getSubcategoriesForCollection(category);
    const customContent = await getMegaMenuContent(category);

    let featuredImage = null;
    let customQuickLinks = null;
    let customSubcategoryCards = null;

    if (customContent?.featuredImage) {
      featuredImage = {
        url:
          resolveFeaturedImageUrl(category, customContent.featuredImage.url) ||
          customContent.featuredImage.url,
        altText: customContent.featuredImage.title,
        width: 1200,
        height: 800,
        productTitle: customContent.featuredImage.title,
        subtitle: customContent.featuredImage.subtitle,
        link: customContent.featuredImage.link,
      };
    } else {
      const hardcodedFeatured = resolveFeaturedImageUrl(category, null);
      if (hardcodedFeatured) {
        featuredImage = {
          url: hardcodedFeatured,
          altText: category.charAt(0).toUpperCase() + category.slice(1),
          width: 1200,
          height: 800,
          productTitle: category.charAt(0).toUpperCase() + category.slice(1),
          subtitle: `Shop ${category}`,
          link: `/${category}`,
        };
      }
    }

    if (customContent?.quickLinks) {
      customQuickLinks = customContent.quickLinks;
    }

    if (customContent?.subcategoryCards) {
      customSubcategoryCards = customContent.subcategoryCards;
    }

    const subcategoriesWithImages = await Promise.all(
      subcategories.map(async (subcategory) => {
        try {
          const mappedTypes = await getProductTypesForCollection(category, subcategory.handle);
          const productTypes = productTypesForMegaMenuThumb(subcategory.handle, mappedTypes);
          const image = await fetchThumbForTypes(productTypes, subcategory.label);
          return { ...subcategory, image };
        } catch (error) {
          console.error(`Error fetching image for ${subcategory.handle}:`, error);
          return { ...subcategory, image: null };
        }
      })
    );

    customQuickLinks = enrichMenuImageItems(customQuickLinks, subcategoriesWithImages, category);
    customSubcategoryCards = enrichMenuImageItems(
      customSubcategoryCards,
      subcategoriesWithImages,
      category
    );

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
