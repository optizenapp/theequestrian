/**
 * Load environment variables from .env.local
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Also try .env
config({ path: resolve(process.cwd(), '.env') });

console.log('[ENV] Environment variables loaded');
console.log('[ENV] POSTGRES_URL:', process.env.POSTGRES_URL ? '✅ Set' : '❌ Not set');
console.log('[ENV] DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
