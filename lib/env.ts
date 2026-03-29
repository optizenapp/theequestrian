import { z } from 'zod';

const envSchema = z.object({
  // Shopify
  SHOPIFY_STORE_DOMAIN: z.string().min(1),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().min(1),
  SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_WEBHOOK_SECRET: z.string().optional(),
  VENDOR_SYNC_APP_CLIENT_SECRET: z.string().optional(),

  // Yotpo
  YOTPO_APP_KEY: z.string().optional(),
  YOTPO_SECRET_KEY: z.string().optional(),

  // Webkul
  WEBKUL_API_KEY: z.string().optional(),
  WEBKUL_API_URL: z.string().optional(),

  // Vercel KV
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),

  // Optional
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  // Google Merchant Center
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  GMC_MERCHANT_ID: z.string().optional(),
  GMC_BASE_URL: z.string().url().optional(),

  // Shopify Inbox
  NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL: z.string().url().optional(),
  NEXT_PUBLIC_SHOPIFY_INBOX_ENABLED: z.string().optional(),
  NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

// Lazy validation - only validate when env is first accessed
// This allows dotenv to load vars before validation runs
let _env: Env | null = null;

function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

// Export env object with lazy validation
export const env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    return getEnv()[prop as keyof Env];
  },
  ownKeys() {
    return Object.keys(getEnv());
  },
  has(_target, prop: string | symbol) {
    return prop in getEnv();
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    const env = getEnv();
    return prop in env
      ? {
          enumerable: true,
          configurable: true,
          value: env[prop as keyof Env],
        }
      : undefined;
  },
});







