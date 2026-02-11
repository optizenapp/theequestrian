import { neon } from '@neondatabase/serverless';

async function main() {
  const prodDb = neon('postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require');
  const devDb = neon('postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require');
  
  console.log('=== Comparing Production vs Dev Databases ===\n');
  
  // Get sample products from prod
  const prodSample = await prodDb`
    SELECT product_handle, category_path, updated_at
    FROM product_category_assignments 
    ORDER BY updated_at DESC 
    LIMIT 5
  `;
  
  console.log('Production DB (ep-floral-wind) - Latest 5:');
  prodSample.forEach((r: any) => console.log(`  ${r.product_handle} → ${r.category_path} (${r.updated_at})`));
  console.log('');
  
  // Get sample products from dev
  const devSample = await devDb`
    SELECT product_handle, category_path, updated_at
    FROM product_category_assignments 
    ORDER BY updated_at DESC 
    LIMIT 5
  `;
  
  console.log('Dev DB (ep-square-dawn) - Latest 5:');
  devSample.forEach((r: any) => console.log(`  ${r.product_handle} → ${r.category_path} (${r.updated_at})`));
  console.log('');
  
  // Check counts
  const prodCount = await prodDb`SELECT COUNT(*)::int as count FROM product_category_assignments`;
  const devCount = await devDb`SELECT COUNT(*)::int as count FROM product_category_assignments`;
  
  console.log(`Production count: ${prodCount[0].count}`);
  console.log(`Dev count: ${devCount[0].count}`);
  console.log('');
  
  if (prodCount[0].count === devCount[0].count) {
    console.log('⚠️  Both databases have the same number of allocations');
    
    // Check if they have the same data
    const prodFirst = prodSample[0];
    const devFirst = devSample[0];
    
    if (prodFirst.product_handle === devFirst.product_handle && 
        prodFirst.category_path === devFirst.category_path) {
      console.log('❌ PROBLEM: The databases appear to be IDENTICAL!');
      console.log('   The jono-dev database should have NEW classifications, but it has the same data as production.');
      console.log('');
      console.log('   This means the AI classification script may have written to the wrong database,');
      console.log('   or the databases were synced/copied.');
    } else {
      console.log('✅ The databases have different allocations (good!)');
    }
  } else {
    console.log('✅ Databases have different counts');
  }
}

main();
