#!/usr/bin/env tsx
/**
 * Test script for ValueSERP API integration
 * 
 * Usage:
 *   npm run test:valueserp
 *   or
 *   tsx scripts/test-valueserp.ts
 */

import 'dotenv/config';

interface ValueSerpResult {
  url: string;
  title: string;
  snippet: string;
  position: number;
}

async function testValueSerpAPI() {
  const apiKey = process.env.VALUESERP_API_KEY || process.env.SERPAPI_API_KEY;
  
  console.log('\n🔍 Testing ValueSERP API Integration\n');
  console.log('='.repeat(50));
  
  // Check API key
  if (!apiKey) {
    console.error('❌ ERROR: VALUESERP_API_KEY not found in environment');
    console.log('\nPlease set VALUESERP_API_KEY in your .env file');
    process.exit(1);
  }
  
  console.log(`✅ API Key found: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  
  // Test query
  const testQuery = 'horse riding boots';
  console.log(`\n📝 Test Query: "${testQuery}"`);
  console.log(`🌏 Location: Australia`);
  
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      q: testQuery,
      location: 'Australia',
      gl: 'au',
      hl: 'en',
      num: '10',
    });
    
    const url = `https://api.valueserp.com/search?${params.toString()}`;
    console.log(`\n🌐 Request URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
    
    console.log('\n⏳ Making API request...');
    const startTime = Date.now();
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Response time: ${elapsed}ms`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API Error (${response.status}): ${errorText.substring(0, 500)}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    // Check for API errors in response
    if (data.error) {
      console.error(`\n❌ ValueSERP Error: ${data.error}`);
      if (data.message) {
        console.error(`   Message: ${data.message}`);
      }
      process.exit(1);
    }
    
    // Parse results
    const organicResults = data.organic_results || [];
    
    console.log(`\n✅ Success! Retrieved ${organicResults.length} organic results`);
    
    if (organicResults.length === 0) {
      console.warn('\n⚠️  Warning: No organic results returned');
      console.log('Full response:', JSON.stringify(data, null, 2));
      process.exit(0);
    }
    
    // Display results
    console.log('\n📊 Top Results:');
    console.log('='.repeat(50));
    
    organicResults.slice(0, 5).forEach((result: any, index: number) => {
      console.log(`\n${index + 1}. ${result.title || 'No title'}`);
      console.log(`   URL: ${result.link || 'No URL'}`);
      console.log(`   Position: ${result.position || index + 1}`);
      console.log(`   Snippet: ${(result.snippet || 'No snippet').substring(0, 100)}...`);
    });
    
    // Check credits/usage info
    if (data.search_metadata) {
      console.log('\n💰 API Usage Info:');
      console.log('='.repeat(50));
      if (data.search_metadata.total_time_taken) {
        console.log(`   Total time: ${data.search_metadata.total_time_taken}`);
      }
      if (data.search_metadata.credits_used) {
        console.log(`   Credits used: ${data.search_metadata.credits_used}`);
      }
      if (data.search_metadata.credits_remaining) {
        console.log(`   Credits remaining: ${data.search_metadata.credits_remaining}`);
      }
    }
    
    // Test data structure
    console.log('\n🔍 Validating Data Structure:');
    console.log('='.repeat(50));
    
    const firstResult = organicResults[0];
    const hasRequiredFields = firstResult.link && firstResult.title && firstResult.snippet;
    
    if (hasRequiredFields) {
      console.log('✅ All required fields present (link, title, snippet)');
    } else {
      console.warn('⚠️  Some required fields missing:');
      if (!firstResult.link) console.warn('   - Missing: link');
      if (!firstResult.title) console.warn('   - Missing: title');
      if (!firstResult.snippet) console.warn('   - Missing: snippet');
    }
    
    console.log('\n✅ ValueSERP API Test Complete!');
    console.log('='.repeat(50));
    console.log('\n💡 Next Steps:');
    console.log('   1. The API is working correctly');
    console.log('   2. Integration with SEO enrichment pipeline is ready');
    console.log('   3. Monitor usage at: https://www.valueserp.com/dashboard');
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Test Failed:');
    console.error('='.repeat(50));
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(`\nStack trace:\n${error.stack}`);
      }
    } else {
      console.error(String(error));
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your API key is correct');
    console.log('   2. Verify you have credits remaining');
    console.log('   3. Check your internet connection');
    console.log('   4. Visit: https://www.valueserp.com/dashboard');
    console.log('\n');
    
    process.exit(1);
  }
}

// Run the test
testValueSerpAPI();
