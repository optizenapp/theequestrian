
import { getProductByHandle, getProductsByTypes } from '@/lib/shopify/products';
import { getCollectionByHandle } from '@/lib/shopify/collections';
import { BestDealsSlider } from '@/components/BestDealsSlider';
import { normalizeProductType } from '@/lib/shopify/collection-mapping';
import { getProductTypesForCollection } from '@/lib/mapping/collection-mapping';
import type { HomeSliderItem, HomeSection } from '@/lib/content/home';

interface BestDealsSliderContainerProps {
  section: HomeSection;
}

// Map for common category handles to display names if not provided
// This can be expanded or moved to a utility
const CATEGORY_LABELS: Record<string, string> = {
  'womens-clothing': 'Riding Apparel',
  'saddles-tack': 'Saddles & Tack',
  'footwear': 'Boots & Footwear',
  'horse-health': 'Horse Care',
  'rider-safety': 'Helmets & Safety',
  'stable-gear': 'Stable Equipment',
  'competition-wear': 'Competition Gear',
  'horse-rugs': 'Horse Rugs',
  'dog-products': 'Dog Products',
  'giftware': 'Gifts',
};

export async function BestDealsSliderContainer({ section }: BestDealsSliderContainerProps) {
  // If we have manual items, we want to enrich them
  const rawItems = section.items || [];
  const productHandles = section.product_handles || [];
  
  if (rawItems.length === 0 && productHandles.length === 0) {
    // If no items configured, we could fallback to defaults or return null
    // For now, let's just render the component which has its own defaults, 
    // but the goal is to drive this from CSV.
    return (
      <BestDealsSlider 
        items={[]} 
        backgroundImage={section.image_url}
        eyebrow={section.eyebrow}
        title={section.title_html}
        subtitle={section.body_html}
      />
    );
  }

  let enrichedItems: HomeSliderItem[] = [];

  // Strategy 1: Use comma-separated handles (Product OR Category)
  if (productHandles.length > 0) {
    enrichedItems = await Promise.all(
      productHandles.map(async (handle) => {
        // 1. Try as Product Handle first
        const productData = await getProductByHandle(handle);
        
        if (productData) {
          // It's a product
          let categoryLabel = productData.productType;
          if (!categoryLabel && productData.collections.edges.length > 0) {
            categoryLabel = productData.collections.edges[0].node.title;
          }
          
          const price = productData.priceRange.minVariantPrice;
          const comparePrice = productData.compareAtPriceRange?.minVariantPrice;
          const savingAmount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount)
            ? `$${(parseFloat(comparePrice.amount) - parseFloat(price.amount)).toFixed(0)} off new`
            : '';

          return {
            label: CATEGORY_LABELS[normalizeProductType(categoryLabel)] || categoryLabel || 'Featured',
            image: productData.images.edges[0]?.node.url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80',
            title: productData.title,
            price: `From $${parseFloat(price.amount).toFixed(0)}`,
            saving: savingAmount,
            detail: productData.description ? productData.description.substring(0, 100) + '...' : '',
            handle: productData.handle
          };
        }

        // 2. Try as Custom Category Handle (e.g., "horse", "rider")
        // These are your headless category routes, not Shopify collections
        const productTypes = await getProductTypesForCollection(handle);
        
        if (productTypes.length > 0) {
          // Fetch products for this category (limit to 1 product)
          const categoryProducts = await getProductsByTypes(productTypes, 1, null);
          const firstProduct = categoryProducts.products[0];
          
          if (firstProduct) {
            const price = firstProduct.priceRange.minVariantPrice;
            const comparePrice = firstProduct.compareAtPriceRange?.minVariantPrice;
            const savingAmount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount)
              ? `$${(parseFloat(comparePrice.amount) - parseFloat(price.amount)).toFixed(0)} off`
              : 'Shop Category';
            
            // Get a nice label for the category
            const categoryLabels: Record<string, string> = {
              'horse': 'Horse',
              'rider': 'Rider',
              'clothing': 'Clothing',
              'pet': 'Pet',
              'accessories': 'Accessories'
            };
            
            return {
              label: categoryLabels[handle] || handle.charAt(0).toUpperCase() + handle.slice(1),
              image: firstProduct.images.edges[0]?.node.url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80',
              title: firstProduct.title,
              price: `From $${parseFloat(price.amount).toFixed(0)}`,
              saving: savingAmount,
              detail: firstProduct.description ? firstProduct.description.substring(0, 100) + '...' : 'Shop this category',
              handle: firstProduct.handle
            };
          }
        }
        
        // 3. Try as Shopify Collection Handle (fallback)
        const collectionData = await getCollectionByHandle(handle, 1);
        
        if (collectionData) {
          const firstProduct = collectionData.products.edges[0]?.node;
          
          if (firstProduct) {
             const price = firstProduct.priceRange.minVariantPrice;
             
             return {
               label: collectionData.title,
               image: firstProduct.images.edges[0]?.node.url || collectionData.image?.url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80',
               title: firstProduct.title,
               price: `From $${parseFloat(price.amount).toFixed(0)}`,
               saving: 'Shop Collection',
               detail: collectionData.description || (firstProduct.description ? firstProduct.description.substring(0, 100) + '...' : ''),
               handle: firstProduct.handle
             };
          }
          
          return {
            label: collectionData.title,
            image: collectionData.image?.url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80',
            title: collectionData.title,
            price: '',
            saving: '',
            detail: collectionData.description || '',
            handle: ''
          };
        }

        // 4. Not found
        return {
          label: `Featured ${handle}`, // Make unique to avoid duplicate keys
          image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80', // Fallback image
          title: 'Item Not Found',
          price: '',
          saving: '',
          detail: `Handle "${handle}" not found`,
          handle
        };
      })
    );
  } 
  // Strategy 2: Legacy JSON items (unchanged logic)
  else {
    enrichedItems = await Promise.all(
      rawItems.map(async (item) => {
        // ... (same as before)
        const productHandle = item.title.toLowerCase().replace(/\s+/g, '-'); 
        const isLikelyHandle = !item.title.includes(' ') || item.title.includes('-');
        
        let productData = null;
        if (isLikelyHandle) {
          productData = await getProductByHandle(item.title);
        }

        let imageUrl = item.image;
        if (!imageUrl) {
          const categoryHandle = item.label.toLowerCase().replace(/\s+/g, '-');
          try {
             const collection = await getCollectionByHandle(categoryHandle, 1);
             if (collection && collection.products.edges.length > 0) {
               imageUrl = collection.products.edges[0].node.images.edges[0]?.node.url || '';
             }
          } catch (e) {
            console.error(`Failed to fetch image for category ${categoryHandle}`, e);
          }
        }

        if (productData) {
          const price = productData.priceRange.minVariantPrice;
          const comparePrice = productData.compareAtPriceRange?.minVariantPrice;
          const savingAmount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount)
            ? `$${(parseFloat(comparePrice.amount) - parseFloat(price.amount)).toFixed(0)} off new`
            : '';

          return {
            label: CATEGORY_LABELS[item.label] || item.label,
            image: imageUrl || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80',
            title: productData.title,
            price: `From $${parseFloat(price.amount).toFixed(0)}`,
            saving: item.saving || savingAmount,
            detail: item.detail || (productData.description ? productData.description.substring(0, 100) + '...' : ''),
            handle: productData.handle
          };
        }

        return {
          ...item,
          image: imageUrl || item.image
        };
      })
    );
  }

  return (
    <BestDealsSlider 
      items={enrichedItems}
      backgroundImage={section.image_url}
      eyebrow={section.eyebrow}
      title={section.title_html}
      subtitle={section.body_html}
    />
  );
}
