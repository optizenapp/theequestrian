import { webkulFetch } from './client';
import { webkulQueue } from '../queue/limiter';
import type { WebkulSeller, WebkulSellerResponse } from './types';

const sellerCache = new Map<string, WebkulSeller>();

export async function getAllSellers(): Promise<WebkulSeller[]> {
  const sellers: WebkulSeller[] = [];
  let page = 1;
  const limit = 250; // Max allowed

  while (true) {
    const data = await webkulQueue.add(() =>
      webkulFetch<{ sellers?: WebkulSeller[] }>(`/api/v2/sellers.json?page=${page}&limit=${limit}`, {
        method: 'GET',
      })
    );

    const pageSellers = data.sellers || [];
    if (pageSellers.length === 0) break;

    sellers.push(...pageSellers);
    
    // Cache them
    for (const seller of pageSellers) {
      sellerCache.set(String(seller.id), seller);
    }

    if (pageSellers.length < limit) break; // Last page
    page += 1;
  }

  return sellers;
}

export async function getSellerById(sellerId: string | number): Promise<WebkulSeller | null> {
  const sellerIdStr = String(sellerId);
  
  // Check cache first
  if (sellerCache.has(sellerIdStr)) {
    return sellerCache.get(sellerIdStr)!;
  }

  try {
    const data = await webkulQueue.add(() =>
      webkulFetch<WebkulSellerResponse>(`/api/v2/sellers/${sellerId}.json`, {
        method: 'GET',
      })
    );

    const seller = data.seller || null;
    
    if (seller) {
      sellerCache.set(sellerIdStr, seller);
    }
    
    return seller;
  } catch (error: any) {
    // If seller not found (404), return null
    if (error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

export function getSellerVendorName(seller: WebkulSeller): string {
  // Try different name fields in order of preference
  return (
    seller.full_name ||
    seller.sp_store_name ||
    `${seller.seller_name || ''} ${seller.last_name || ''}`.trim() ||
    seller.store_name_handle ||
    String(seller.id)
  );
}

export function clearSellerCache() {
  sellerCache.clear();
}
