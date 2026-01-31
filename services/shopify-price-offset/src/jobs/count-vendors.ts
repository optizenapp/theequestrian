import { initDb } from '../db/index.js';
import { loadVendorRates } from '../db/rates.js';

async function run() {
  await initDb();
  const vendorRates = await loadVendorRates();

  console.log('\nVendors with shipping rates:');
  console.log('============================');
  const vendors = Array.from(vendorRates.keys()).sort();
  for (const vendor of vendors) {
    const rate = vendorRates.get(vendor);
    console.log(`- ${vendor}: $${rate}`);
  }
  console.log(`\nTotal vendors: ${vendorRates.size}`);
}

run().catch(console.error);
