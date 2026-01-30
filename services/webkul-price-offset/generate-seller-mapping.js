// Generate seller-to-vendor mapping from Webkul API
require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const WEBKUL_API_URL = process.env.WEBKUL_API_BASE_URL;
const WEBKUL_TOKEN = process.env.WEBKUL_ACCESS_TOKEN;

async function webkulFetch(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, WEBKUL_API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${WEBKUL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Webkul API ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('Fetching all sellers from Webkul...\n');
  
  const response = await webkulFetch('/api/v2/sellers.json?limit=250');
  const sellers = response.sellers || [];
  
  console.log(`Found ${sellers.length} sellers\n`);
  
  // Create CSV content
  let csv = 'seller_id,vendor_name\n';
  
  for (const seller of sellers) {
    const sellerId = seller.id;
    const vendorName = seller.sp_store_name || seller.store_name_handle || seller.seller_name || '';
    csv += `${sellerId},${vendorName}\n`;
  }
  
  // Write to public folder
  const outputPath = path.join(__dirname, '../../public/seller-to-vendor-mapping.csv');
  fs.writeFileSync(outputPath, csv);
  
  console.log(`✅ Created: ${outputPath}`);
  console.log(`\nSeller mappings: ${sellers.length}`);
}

main().catch(console.error);
