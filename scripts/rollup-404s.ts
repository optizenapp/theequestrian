import 'dotenv/config';
import { rollupNotFoundEvents } from '@/lib/not-found/rollup';

async function run() {
  const days = await rollupNotFoundEvents(30);
  console.log(`Rolled up ${days} days of 404 events.`);
}

run().catch((error) => {
  console.error('404 rollup failed:', error);
  process.exit(1);
});
