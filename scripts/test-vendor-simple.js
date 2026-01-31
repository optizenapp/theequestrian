const fs = require('fs');
const path = require('path');

// Load CSV
const csvPath = path.join(process.cwd(), 'vendor-shipping.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

const vendorRates = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const vendor = parts[0]?.trim();
  const shipping = parts[1]?.trim();
  const tag = parts[2]?.trim();
  
  if (vendor && shipping && !tag) {
    const rate = parseFloat(shipping);
    if (!isNaN(rate)) {
      vendorRates.set(vendor, rate);
    }
  }
}

console.log(`📋 Loaded ${vendorRates.size} vendors with base rates\n`);

// Test matching
function testMatch(shopifyVendor) {
  const vendorLower = shopifyVendor.toLowerCase().trim();
  
  for (const [csvVendor, rate] of vendorRates.entries()) {
    if (csvVendor.toLowerCase() === vendorLower) {
      console.log(`✓ "${shopifyVendor}" matches "${csvVendor}" ($${rate})`);
      return true;
    }
  }
  
  console.log(`✗ "${shopifyVendor}" - NO MATCH`);
  return false;
}

console.log('🧪 Testing matches:\n');
testMatch('Ascot Saddlery');
testMatch('Dapple EQ');
testMatch('Dapple Eq');
testMatch('Tacklet');
testMatch('Random Vendor');

console.log('\n✅ Done!');
