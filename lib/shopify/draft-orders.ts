/**
 * Shopify Draft Orders
 * 
 * Create draft orders with custom prices (base + shipping)
 * for headless checkout flow
 */

import { shopifyAdminFetch } from './admin-client';
import { getShippingCost } from '@/lib/shipping/rates';

export interface DraftOrderLineItem {
  variantId: string;
  quantity: number;
  basePrice: number;
  vendor: string;
  tags?: string[];
  title: string;
  weightInKg?: number; // Product weight for weight-based shipping
}

export interface DraftOrderCustomer {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface DraftOrder {
  id: string;
  invoiceUrl: string;
  totalPrice: string;
  lineItems: Array<{
    title: string;
    quantity: number;
    originalUnitPrice: string;
  }>;
}

const CREATE_DRAFT_ORDER_MUTATION = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
        totalPrice
        lineItems(first: 50) {
          edges {
            node {
              title
              quantity
              originalUnitPrice
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Create a draft order with custom prices (base + shipping)
 */
export async function createDraftOrderWithShipping(
  items: DraftOrderLineItem[],
  customer: DraftOrderCustomer
): Promise<DraftOrder> {
  console.log('[DraftOrder] Creating order for:', customer.email);
  console.log('[DraftOrder] Items:', items.length);
  
  // Calculate prices with shipping
  const lineItems = items.map(item => {
    const shippingCost = getShippingCost(item.vendor, item.tags || [], item.weightInKg);
    const totalPrice = item.basePrice + shippingCost;
    
    const weightInfo = item.weightInKg ? ` (${item.weightInKg}kg)` : '';
    console.log(`[DraftOrder] ${item.title}${weightInfo}: $${item.basePrice} + $${shippingCost} = $${totalPrice}`);
    
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      originalUnitPrice: totalPrice.toFixed(2), // Custom price!
    };
  });
  
  // Calculate totals for logging
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.originalUnitPrice) * item.quantity);
  }, 0);
  
  console.log(`[DraftOrder] Subtotal: $${subtotal.toFixed(2)}`);
  console.log(`[DraftOrder] Shipping: FREE (included in prices)`);
  
  try {
    const response = await shopifyAdminFetch<{
      draftOrderCreate: {
        draftOrder: {
          id: string;
          invoiceUrl: string;
          totalPrice: string;
          lineItems: {
            edges: Array<{
              node: {
                title: string;
                quantity: number;
                originalUnitPrice: string;
              };
            }>;
          };
        } | null;
        userErrors: Array<{
          field: string[];
          message: string;
        }>;
      };
    }>({
      query: CREATE_DRAFT_ORDER_MUTATION,
      variables: {
        input: {
          lineItems,
          
          // Free shipping (shipping is in the line item prices)
          shippingLine: {
            title: 'Free Shipping',
            price: '0.00',
          },
          
          // Customer info
          email: customer.email,
          
          // Custom attributes for tracking
          customAttributes: [
            {
              key: '_created_via',
              value: 'headless_storefront',
            },
            {
              key: '_prices_include_shipping',
              value: 'true',
            },
            {
              key: '_created_at',
              value: new Date().toISOString(),
            },
          ],
          
          // Tags for filtering/reporting
          tags: ['headless', 'shipping-included'],
          
          // Note for admin
          note: 'Order created via headless storefront. Prices include shipping costs.',
        },
      },
    });
    
    // Check for errors
    if (response.draftOrderCreate.userErrors.length > 0) {
      const errors = response.draftOrderCreate.userErrors;
      console.error('[DraftOrder] Creation failed:', errors);
      throw new Error(`Draft order creation failed: ${errors[0].message}`);
    }
    
    if (!response.draftOrderCreate.draftOrder) {
      throw new Error('Draft order creation returned no data');
    }
    
    const draftOrder = response.draftOrderCreate.draftOrder;
    
    console.log('[DraftOrder] ✅ Created:', draftOrder.id);
    console.log('[DraftOrder] Invoice URL:', draftOrder.invoiceUrl);
    console.log('[DraftOrder] Total:', draftOrder.totalPrice);
    
    return {
      id: draftOrder.id,
      invoiceUrl: draftOrder.invoiceUrl,
      totalPrice: draftOrder.totalPrice,
      lineItems: draftOrder.lineItems.edges.map(({ node }) => node),
    };
  } catch (error) {
    console.error('[DraftOrder] Error creating draft order:', error);
    throw error;
  }
}

/**
 * Helper to calculate what the final price will be
 * Use this to show customer accurate totals before creating draft order
 */
export function calculateDraftOrderTotal(items: DraftOrderLineItem[]): {
  subtotal: number;
  shipping: number;
  total: number;
  breakdown: Array<{
    title: string;
    basePrice: number;
    shippingCost: number;
    totalPrice: number;
    quantity: number;
    weightInKg?: number;
  }>;
} {
  const breakdown = items.map(item => {
    const shippingCost = getShippingCost(item.vendor, item.tags || [], item.weightInKg);
    const totalPrice = item.basePrice + shippingCost;
    
    return {
      title: item.title,
      basePrice: item.basePrice,
      shippingCost,
      totalPrice,
      quantity: item.quantity,
      weightInKg: item.weightInKg,
    };
  });
  
  const subtotal = breakdown.reduce((sum, item) => {
    return sum + (item.totalPrice * item.quantity);
  }, 0);
  
  return {
    subtotal,
    shipping: 0, // Free (included in subtotal)
    total: subtotal,
    breakdown,
  };
}
