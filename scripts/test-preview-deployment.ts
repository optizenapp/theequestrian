/**
 * Test the preview deployment to see what database it's connecting to
 * This will make a request and check the response
 */

async function main() {
  const deploymentUrl = process.argv[2] || 'https://theequestrian-ew2xwbeo5-jono-silicondales-projects.vercel.app';
  const testPath = '/horse';
  
  console.log(`Testing: ${deploymentUrl}${testPath}`);
  console.log('');
  
  try {
    const response = await fetch(`${deploymentUrl}${testPath}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');
    
    if (response.status === 404) {
      console.log('✅ Got 404 - this confirms the page is returning notFound()');
      console.log('This means getProductsByCategory() returned 0 products');
      console.log('');
      console.log('Next steps:');
      console.log('1. Check Vercel logs to see which database was connected');
      console.log('2. Verify CUSTOM_DATABASE_URL is set correctly for jono-dev branch');
      console.log('3. Confirm the jono-dev database (ep-square-dawn) has the allocations');
    } else if (response.status === 200) {
      const html = await response.text();
      const hasProducts = html.includes('product-card') || html.includes('ProductGrid');
      console.log(`✅ Got 200 - Page loaded successfully`);
      console.log(`Has products: ${hasProducts}`);
    } else if (response.status === 401) {
      console.log('❌ Got 401 - Authentication required');
      console.log('The preview deployment may have password protection enabled');
    } else {
      console.log(`Unexpected status: ${response.status}`);
      const text = await response.text();
      console.log('Response preview:', text.substring(0, 500));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
