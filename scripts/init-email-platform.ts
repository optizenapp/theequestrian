import { config } from 'dotenv';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';

config({ path: '.env.local' });

async function run() {
  console.log('Initializing email platform schema...');
  await ensureEmailPlatformSchema();
  console.log('Email platform schema initialized successfully.');
}

run().catch((error) => {
  console.error('Failed to initialize email platform schema:', error);
  process.exit(1);
});
