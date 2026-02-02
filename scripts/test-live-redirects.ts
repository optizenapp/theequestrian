#!/usr/bin/env tsx
/**
 * Test live redirects on production site
 * Checks if legacy URLs properly redirect to new structure
 */

import { collectionRedirects, blogRedirects, pageRedirects } from '@/lib/redirects/maps';

const SITE_URL = 'https://www.theequestrian.com.au';

interface RedirectTest {
  from: string;
  to: string;
  type: 'collection' | 'blog' | 'page';
}

async function testRedirect(from: string, expectedTo: string): Promise<{
  success: boolean;
  actualLocation: string | null;
  statusCode: number;
}> {
  try {
    const response = await fetch(`${SITE_URL}${from}`, {
      redirect: 'manual', // Don't follow redirects automatically
    });

    const location = response.headers.get('location');
    const statusCode = response.status;

    // Normalize location (remove domain if present)
    let normalizedLocation = location;
    if (normalizedLocation?.startsWith('http')) {
      normalizedLocation = new URL(normalizedLocation).pathname;
    }

    const success = statusCode === 301 && normalizedLocation === expectedTo;

    return {
      success,
      actualLocation: normalizedLocation,
      statusCode,
    };
  } catch (error: any) {
    return {
      success: false,
      actualLocation: null,
      statusCode: 0,
    };
  }
}

async function testAllRedirects() {
  console.log(`🔍 Testing redirects on ${SITE_URL}\n`);

  const tests: RedirectTest[] = [
    // Collection redirects
    ...Object.entries(collectionRedirects).map(([from, to]) => ({
      from,
      to,
      type: 'collection' as const,
    })),
    // Blog redirects
    ...Object.entries(blogRedirects).map(([from, to]) => ({
      from,
      to,
      type: 'blog' as const,
    })),
    // Page redirects
    ...Object.entries(pageRedirects).map(([from, to]) => ({
      from,
      to,
      type: 'page' as const,
    })),
  ];

  let passed = 0;
  let failed = 0;
  const failures: Array<{ from: string; to: string; reason: string }> = [];

  console.log(`📊 Testing ${tests.length} redirects...\n`);

  // Test a sample first (10 redirects)
  const sampleSize = Math.min(10, tests.length);
  console.log(`🔬 Testing sample of ${sampleSize} redirects first...\n`);

  for (let i = 0; i < sampleSize; i++) {
    const test = tests[i];
    const result = await testRedirect(test.from, test.to);

    if (result.success) {
      passed++;
      console.log(`   ✅ ${test.from} → ${test.to}`);
    } else {
      failed++;
      const reason = result.statusCode === 0
        ? 'Network error'
        : result.statusCode !== 301
        ? `Wrong status: ${result.statusCode}`
        : `Wrong location: ${result.actualLocation} (expected: ${test.to})`;

      failures.push({ from: test.from, to: test.to, reason });
      console.log(`   ❌ ${test.from} → ${reason}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Sample Results:\n`);
  console.log(`   ✅ Passed: ${passed}/${sampleSize}`);
  console.log(`   ❌ Failed: ${failed}/${sampleSize}`);

  if (failed === 0 && sampleSize === 10) {
    console.log(`\n✅ Sample looks good! Testing all ${tests.length} redirects...\n`);

    // Reset counters
    passed = 0;
    failed = 0;
    failures.length = 0;

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      const result = await testRedirect(test.from, test.to);

      if (result.success) {
        passed++;
      } else {
        failed++;
        const reason = result.statusCode === 0
          ? 'Network error'
          : result.statusCode !== 301
          ? `Wrong status: ${result.statusCode}`
          : `Wrong location: ${result.actualLocation} (expected: ${test.to})`;

        failures.push({ from: test.from, to: test.to, reason });
      }

      // Progress indicator
      if ((i + 1) % 25 === 0) {
        console.log(`   Tested ${i + 1}/${tests.length}...`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n📊 FINAL RESULTS:\n`);
  console.log(`   Total redirects: ${tests.length}`);
  console.log(`   ✅ Passed: ${passed} (${Math.round((passed / tests.length) * 100)}%)`);
  console.log(`   ❌ Failed: ${failed} (${Math.round((failed / tests.length) * 100)}%)`);

  if (failures.length > 0) {
    console.log(`\n❌ Failed Redirects (showing first 20):\n`);
    failures.slice(0, 20).forEach((f) => {
      console.log(`   ${f.from} → ${f.to}`);
      console.log(`   Reason: ${f.reason}\n`);
    });

    if (failures.length > 20) {
      console.log(`   ... and ${failures.length - 20} more\n`);
    }
  }

  // Summary by type
  const collectionTests = tests.filter(t => t.type === 'collection');
  const blogTests = tests.filter(t => t.type === 'blog');
  const pageTests = tests.filter(t => t.type === 'page');

  console.log(`\n📋 Breakdown by Type:\n`);
  console.log(`   Collections: ${collectionTests.length} redirects`);
  console.log(`   Blogs: ${blogTests.length} redirects`);
  console.log(`   Pages: ${pageTests.length} redirects`);

  console.log('\n');

  if (failed === 0) {
    console.log('🎉 All redirects working perfectly!\n');
  } else {
    console.log('⚠️  Some redirects need attention.\n');
  }
}

testAllRedirects().catch(console.error);
