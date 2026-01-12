import { collectionRedirects } from '../lib/redirects/maps';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function testRedirect(from: string, expectedTo: string) {
  try {
    const response = await fetch(`${BASE_URL}${from}`, {
      redirect: 'manual' // Don't follow redirects
    });
    
    const location = response.headers.get('location');
    const status = response.status;
    
    const passed = status === 301 && location === expectedTo;
    
    console.log(
      passed ? '✅' : '❌',
      from,
      '→',
      location || 'NO REDIRECT',
      `(${status})`
    );
    
    return passed;
  } catch (error) {
    console.error('❌', from, '→ ERROR:', (error as Error).message);
    return false;
  }
}

async function testAllRedirects() {
  console.log(`🧪 Testing redirects on: ${BASE_URL}\n`);
  
  const redirects = Object.entries(collectionRedirects);
  let passed = 0;
  let failed = 0;
  
  for (const [from, to] of redirects) {
    const result = await testRedirect(from, to);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${redirects.length}`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some redirects failed. Please check the output above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All redirects working correctly!');
    process.exit(0);
  }
}

testAllRedirects();
