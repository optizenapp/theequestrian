import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';

interface PageSpeedResponse {
  lighthouseResult: {
    categories: {
      performance: { score: number };
      accessibility: { score: number };
      'best-practices': { score: number };
      seo: { score: number };
    };
    audits: {
      'first-contentful-paint': { numericValue: number };
      'largest-contentful-paint': { numericValue: number };
      'cumulative-layout-shift': { numericValue: number };
      'total-blocking-time': { numericValue: number };
      'speed-index': { numericValue: number };
      [key: string]: any;
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const { pageType, customUrl } = await req.json();

    if (!pageType) {
      return NextResponse.json({ error: 'Page type is required' }, { status: 400 });
    }

    // Build URL based on page type
    let targetUrl = customUrl;
    if (!customUrl) {
      switch (pageType) {
        case 'homepage':
          targetUrl = SITE_URL;
          break;
        case 'collection':
          targetUrl = `${SITE_URL}/horse`;
          break;
        case 'subcollection':
          targetUrl = `${SITE_URL}/horse/boots`;
          break;
        case 'product':
          targetUrl = `${SITE_URL}/horse/boots/bell-boots`;
          break;
        case 'brand':
          targetUrl = `${SITE_URL}/brands/weatherbeeta`;
          break;
        case 'on-sale':
          targetUrl = `${SITE_URL}/on-sale`;
          break;
        default:
          return NextResponse.json({ error: 'Invalid page type' }, { status: 400 });
      }
    }

    // Call PageSpeed Insights API
    const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    apiUrl.searchParams.set('url', targetUrl);
    apiUrl.searchParams.set('strategy', 'mobile');
    apiUrl.searchParams.set('category', 'performance');
    apiUrl.searchParams.set('category', 'accessibility');
    apiUrl.searchParams.set('category', 'best-practices');
    apiUrl.searchParams.set('category', 'seo');
    if (PAGESPEED_API_KEY) {
      apiUrl.searchParams.set('key', PAGESPEED_API_KEY);
    }

    console.log('[PageSpeed] Scanning URL:', targetUrl);
    console.log('[PageSpeed] API URL:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PageSpeed] API error:', errorText);
      return NextResponse.json(
        { error: `PageSpeed API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data: PageSpeedResponse = await response.json();
    console.log('[PageSpeed] Scan completed successfully');
    const { lighthouseResult } = data;

    // Extract scores
    const performanceScore = Math.round((lighthouseResult.categories.performance?.score || 0) * 100);
    const accessibilityScore = Math.round((lighthouseResult.categories.accessibility?.score || 0) * 100);
    const bestPracticesScore = Math.round((lighthouseResult.categories['best-practices']?.score || 0) * 100);
    const seoScore = Math.round((lighthouseResult.categories.seo?.score || 0) * 100);

    // Extract Core Web Vitals
    const fcp = (lighthouseResult.audits['first-contentful-paint']?.numericValue || 0) / 1000;
    const lcp = (lighthouseResult.audits['largest-contentful-paint']?.numericValue || 0) / 1000;
    const cls = lighthouseResult.audits['cumulative-layout-shift']?.numericValue || 0;
    const tbt = lighthouseResult.audits['total-blocking-time']?.numericValue || 0;
    const si = (lighthouseResult.audits['speed-index']?.numericValue || 0) / 1000;

    // Store in database
    const result = await sql`
      INSERT INTO performance_scans (
        page_type,
        page_url,
        performance_score,
        accessibility_score,
        best_practices_score,
        seo_score,
        fcp,
        lcp,
        cls,
        tbt,
        si,
        raw_data,
        status
      ) VALUES (
        ${pageType},
        ${targetUrl},
        ${performanceScore},
        ${accessibilityScore},
        ${bestPracticesScore},
        ${seoScore},
        ${fcp},
        ${lcp},
        ${cls},
        ${tbt},
        ${si},
        ${JSON.stringify(data)},
        'completed'
      )
      RETURNING id, page_type, page_url, scan_date, performance_score, accessibility_score, 
                best_practices_score, seo_score, fcp, lcp, cls, tbt, si
    `;

    return NextResponse.json({
      success: true,
      scan: result.rows[0],
      opportunities: extractOpportunities(lighthouseResult),
      diagnostics: extractDiagnostics(lighthouseResult),
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run scan' },
      { status: 500 }
    );
  }
}

function extractOpportunities(lighthouseResult: PageSpeedResponse['lighthouseResult']) {
  const opportunities = [];
  const audits = lighthouseResult.audits;

  const opportunityKeys = [
    'render-blocking-resources',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
    'efficient-animated-content',
    'duplicated-javascript',
    'legacy-javascript',
    'total-byte-weight',
    'uses-long-cache-ttl',
    'uses-optimized-images',
    'uses-text-compression',
    'uses-responsive-images',
  ];

  for (const key of opportunityKeys) {
    const audit = audits[key];
    if (audit && audit.score !== null && audit.score < 1) {
      opportunities.push({
        id: key,
        title: audit.title,
        description: audit.description,
        score: Math.round((audit.score || 0) * 100),
        displayValue: audit.displayValue || '',
        numericValue: audit.numericValue || 0,
      });
    }
  }

  return opportunities.sort((a, b) => a.score - b.score);
}

function extractDiagnostics(lighthouseResult: PageSpeedResponse['lighthouseResult']) {
  const diagnostics = [];
  const audits = lighthouseResult.audits;

  const diagnosticKeys = [
    'mainthread-work-breakdown',
    'bootup-time',
    'uses-rel-preconnect',
    'font-display',
    'third-party-summary',
    'largest-contentful-paint-element',
    'layout-shift-elements',
    'long-tasks',
    'non-composited-animations',
    'unsized-images',
  ];

  for (const key of diagnosticKeys) {
    const audit = audits[key];
    if (audit && audit.score !== null && audit.score < 1) {
      diagnostics.push({
        id: key,
        title: audit.title,
        description: audit.description,
        score: Math.round((audit.score || 0) * 100),
        displayValue: audit.displayValue || '',
      });
    }
  }

  return diagnostics;
}
