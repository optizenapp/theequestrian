import dotenv from 'dotenv';

dotenv.config();

export const config = {
  shopify: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN || '',
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
    apiVersion: '2024-01',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  csv: {
    vendorRates: process.env.VENDOR_RATES_CSV || '../../vendor-shipping.csv',
    sellerMapping: process.env.SELLER_MAPPING_CSV || '../../public/seller-to-vendor-mapping.csv',
  },
  rateLimit: {
    perSecond: Number(process.env.SHOPIFY_RATE_LIMIT_PER_SEC) || 2,
  },
  dryRun: process.env.SHOPIFY_DRY_RUN === 'true',
};
