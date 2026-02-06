import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';

async function testPageSpeedAPI() {
  console.log('🔍 Testing PageSpeed Insights API...\n');
  console.log('Target URL:', SITE_URL);
  console.log('API Key:', PAGESPEED_API_KEY ? `${PAGESPEED_API_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('');

  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  apiUrl.searchParams.set('url', SITE_URL);
  apiUrl.searchParams.set('strategy', 'mobile');
  // Use append instead of set for multiple categories
  apiUrl.searchParams.append('category', 'performance');
  apiUrl.searchParams.append('category', 'accessibility');
  apiUrl.searchParams.append('category', 'best-practices');
  apiUrl.searchParams.append('category', 'seo');
  
  if (PAGESPEED_API_KEY) {
    apiUrl.searchParams.set('key', PAGESPEED_API_KEY);
  }

  console.log('📡 Calling API...');
  console.log('API URL:', apiUrl.toString().replace(PAGESPEED_API_KEY, 'HIDDEN'));
  console.log('');

  try {
    const startTime = Date.now();
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Request took ${duration}ms`);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();

    if (!data.lighthouseResult) {
      console.error('❌ No lighthouseResult in response');
      console.log('Response keys:', Object.keys(data));
      return;
    }

    const { lighthouseResult } = data;

    // Extract scores
    const performanceScore = Math.round((lighthouseResult.categories?.performance?.score || 0) * 100);
    const accessibilityScore = Math.round((lighthouseResult.categories?.accessibility?.score || 0) * 100);
    const bestPracticesScore = Math.round((lighthouseResult.categories?.['best-practices']?.score || 0) * 100);
    const seoScore = Math.round((lighthouseResult.categories?.seo?.score || 0) * 100);

    console.log('✅ Scan completed successfully!\n');
    console.log('📊 Scores:');
    console.log('  Performance:    ', performanceScore, '/100');
    console.log('  Accessibility:  ', accessibilityScore, '/100');
    console.log('  Best Practices: ', bestPracticesScore, '/100');
    console.log('  SEO:            ', seoScore, '/100');
    console.log('');

    // Extract Core Web Vitals
    const fcp = (lighthouseResult.audits?.['first-contentful-paint']?.numericValue || 0) / 1000;
    const lcp = (lighthouseResult.audits?.['largest-contentful-paint']?.numericValue || 0) / 1000;
    const cls = lighthouseResult.audits?.['cumulative-layout-shift']?.numericValue || 0;
    const tbt = lighthouseResult.audits?.['total-blocking-time']?.numericValue || 0;
    const si = (lighthouseResult.audits?.['speed-index']?.numericValue || 0) / 1000;

    console.log('⚡ Core Web Vitals:');
    console.log('  FCP (First Contentful Paint):   ', fcp.toFixed(2), 's');
    console.log('  LCP (Largest Contentful Paint): ', lcp.toFixed(2), 's');
    console.log('  CLS (Cumulative Layout Shift):  ', cls.toFixed(3));
    console.log('  TBT (Total Blocking Time):      ', tbt.toFixed(0), 'ms');
    console.log('  SI (Speed Index):               ', si.toFixed(2), 's');
    console.log('');

    // Count opportunities
    const opportunities = Object.keys(lighthouseResult.audits || {}).filter(key => {
      const audit = lighthouseResult.audits[key];
      return audit.score !== null && audit.score < 1 && audit.details?.type === 'opportunity';
    });

    console.log('🎯 Opportunities found:', opportunities.length);
    console.log('');

    console.log('✨ API test successful!');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
}

testPageSpeedAPI();
