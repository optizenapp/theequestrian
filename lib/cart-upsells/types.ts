export type CartUpsellTriggerType = 'product_handle' | 'product_type' | 'vendor';

export type CartUpsellOffer = {
  id: number;
  name: string;
  enabled: boolean;
  priority: number;
  headline: string;
  triggerType: CartUpsellTriggerType;
  triggerValues: string[];
  candidateHandles: string[];
  maxProducts: number;
  createdAt: string;
  updatedAt: string;
};

export type CartUpsellOfferInput = {
  name: string;
  enabled?: boolean;
  priority?: number;
  headline?: string;
  triggerType: CartUpsellTriggerType;
  triggerValues: string[];
  candidateHandles: string[];
  maxProducts?: number;
};

export type CartUpsellCartItem = {
  handle: string;
  productType: string;
  vendor: string;
  price: number;
};

export type CartUpsellProduct = {
  id: string;
  handle: string;
  title: string;
  availableForSale: boolean;
  vendor: string;
  productType: string;
  priceAmount: string;
  currencyCode: string;
  imageUrl: string | null;
  imageAlt: string | null;
  firstVariantId: string | null;
};

export type CartUpsellResolveResult = {
  products: CartUpsellProduct[];
  headline: string;
  source: 'curated' | 'fallback' | 'empty';
  offerId: number | null;
};