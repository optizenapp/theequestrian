import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { upsertContactFromShopifyCustomer } from '@/lib/email-platform/contacts';
import { upsertOrderFactFromShopifyPayload, recomputeCustomerAffinities, recomputeCustomerAggregates } from '@/lib/email-platform/orders';

type ShopifyCustomerNode = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  emailMarketingConsent: {
    marketingState: string;
  } | null;
  tags: string[];
};

function customerAcceptsMarketing(customer: ShopifyCustomerNode): boolean {
  const state = customer.emailMarketingConsent?.marketingState?.toUpperCase() || '';
  return state === 'SUBSCRIBED' || state === 'PENDING';
}

type ShopifyOrderNode = {
  id: string;
  name: string;
  createdAt: string | null;
  processedAt: string | null;
  cancelledAt: string | null;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  currentSubtotalPriceSet: { shopMoney: { amount: string } };
  totalRefundedSet: { shopMoney: { amount: string } };
  customer: { id: string; email: string | null } | null;
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        originalUnitPriceSet: { shopMoney: { amount: string } };
        product: {
          id: string;
          productType: string | null;
          vendor: string | null;
          handle: string | null;
        } | null;
      };
    }>;
  };
};

async function fetchCustomersPage(afterCursor?: string | null) {
  const query = `
    query CustomersForEmailSync($first: Int!, $after: String) {
      customers(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            email
            firstName
            lastName
            emailMarketingConsent {
              marketingState
            }
            tags
          }
        }
      }
    }
  `;
  return shopifyAdminFetch<{
    customers: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ node: ShopifyCustomerNode }>;
    };
  }>({
    query,
    variables: { first: 100, after: afterCursor || null },
  });
}

async function fetchOrdersPage(afterCursor?: string | null) {
  const query = `
    query OrdersForEmailSync($first: Int!, $after: String) {
      orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            name
            createdAt
            processedAt
            cancelledAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            currentSubtotalPriceSet {
              shopMoney {
                amount
              }
            }
            totalRefundedSet {
              shopMoney {
                amount
              }
            }
            customer {
              id
              email
            }
            lineItems(first: 50) {
              edges {
                node {
                  title
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                  product {
                    id
                    productType
                    vendor
                    handle
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  return shopifyAdminFetch<{
    orders: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: Array<{ node: ShopifyOrderNode }>;
    };
  }>({
    query,
    variables: { first: 100, after: afterCursor || null },
  });
}

function orderNodeToWebhookLikePayload(order: ShopifyOrderNode) {
  return {
    id: order.id.replace('gid://shopify/Order/', ''),
    order_number: order.name.replace('#', ''),
    customer: order.customer
      ? {
          id: order.customer.id.replace('gid://shopify/Customer/', ''),
          email: order.customer.email,
        }
      : null,
    created_at: order.createdAt,
    processed_at: order.processedAt,
    cancelled_at: order.cancelledAt,
    financial_status: order.displayFinancialStatus.toLowerCase(),
    fulfillment_status: order.displayFulfillmentStatus.toLowerCase(),
    currency: order.totalPriceSet?.shopMoney?.currencyCode || 'AUD',
    subtotal_price: order.currentSubtotalPriceSet?.shopMoney?.amount || '0',
    total_price: order.totalPriceSet?.shopMoney?.amount || '0',
    total_refunded_set: {
      shop_money: {
        amount: order.totalRefundedSet?.shopMoney?.amount || '0',
      },
    },
    line_items: order.lineItems.edges.map(({ node }) => ({
      title: node.title,
      quantity: node.quantity,
      price: node.originalUnitPriceSet?.shopMoney?.amount || '0',
      product_id: node.product?.id.replace('gid://shopify/Product/', '') || null,
      product_type: node.product?.productType || null,
      vendor: node.product?.vendor || null,
      handle: node.product?.handle || null,
    })),
  };
}

export async function syncShopifyCustomersAndOrders(options?: {
  maxCustomerPages?: number;
  maxOrderPages?: number;
}) {
  const maxCustomerPages = options?.maxCustomerPages ?? 5;
  const maxOrderPages = options?.maxOrderPages ?? 5;

  let importedCustomers = 0;
  let importedOrders = 0;

  let customerCursor: string | null = null;
  for (let page = 0; page < maxCustomerPages; page += 1) {
    const data = await fetchCustomersPage(customerCursor);
    for (const edge of data.customers.edges) {
      const result = await upsertContactFromShopifyCustomer({
        id: edge.node.id,
        email: edge.node.email,
        firstName: edge.node.firstName,
        lastName: edge.node.lastName,
        acceptsMarketing: customerAcceptsMarketing(edge.node),
        tags: edge.node.tags,
      });
      if (result) {
        importedCustomers += 1;
      }
    }
    if (!data.customers.pageInfo.hasNextPage) {
      break;
    }
    customerCursor = data.customers.pageInfo.endCursor;
  }

  let orderCursor: string | null = null;
  for (let page = 0; page < maxOrderPages; page += 1) {
    const data = await fetchOrdersPage(orderCursor);
    for (const edge of data.orders.edges) {
      await upsertOrderFactFromShopifyPayload(orderNodeToWebhookLikePayload(edge.node));
      importedOrders += 1;
    }
    if (!data.orders.pageInfo.hasNextPage) {
      break;
    }
    orderCursor = data.orders.pageInfo.endCursor;
  }

  await recomputeCustomerAggregates();
  await recomputeCustomerAffinities();

  return {
    importedCustomers,
    importedOrders,
    customerCursor,
    orderCursor,
  };
}
