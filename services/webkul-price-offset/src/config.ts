import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 4010),
  webkulBaseUrl: process.env.WEBKUL_API_BASE_URL || 'https://mvmapi.webkul.com',
  webkulAuthHeader: process.env.WEBKUL_AUTH_HEADER || 'Authorization',
  webkulAccessToken: process.env.WEBKUL_ACCESS_TOKEN || '',
  webkulRefreshToken: process.env.WEBKUL_REFRESH_TOKEN || '',
  webkulAuthToken: process.env.WEBKUL_AUTH_TOKEN || '',
  webkulClientId: process.env.WEBKUL_CLIENT_ID || '',
  webkulClientSecret: process.env.WEBKUL_CLIENT_SECRET || '',
  webkulWebhookSecret: process.env.WEBKUL_WEBHOOK_SECRET || '',
  vendorRatesCsv: process.env.VENDOR_RATES_CSV || '../../exports/vendor-shipping-rates.csv',
  tagRatesCsv: process.env.TAG_RATES_CSV || '../../exports/tag-shipping-rates.csv',
  sellerMappingCsv: process.env.SELLER_MAPPING_CSV || '../../exports/seller-to-vendor-mapping.csv',
  databaseUrl: requireEnv('DATABASE_URL'),
  rateLimitPerSec: Number(process.env.WEBKUL_RATE_LIMIT_PER_SEC || 2),
  pageSize: Number(process.env.WEBKUL_PAGE_SIZE || 50),
};
