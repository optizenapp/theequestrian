import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  let scanId: number | undefined = undefined;
  
  try {
    const body = await req.json();
    scanId = body.scanId;

    if (!scanId) {
      return NextResponse.json({ error: 'Scan ID is required' }, { status: 400 });
    }

    // Fetch scan data
    const scanResult = await sql`
      SELECT id, page_type, page_url, performance_score, accessibility_score, 
             best_practices_score, seo_score, fcp, lcp, cls, tbt, si, raw_data
      FROM performance_scans
      WHERE id = ${scanId}
    `;

    if (scanResult.rows.length === 0) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const scan = scanResult.rows[0];
    const rawData = scan.raw_data;

    // Update status to analyzing
    await sql`
      UPDATE performance_scans
      SET status = 'analyzing', updated_at = NOW()
      WHERE id = ${scanId}
    `;

    // Prepare data for AI analysis
    const lighthouseResult = rawData.lighthouseResult;
    const opportunities = extractOpportunities(lighthouseResult);
    const diagnostics = extractDiagnostics(lighthouseResult);

    // Build prompt for AI
    const prompt = buildAnalysisPrompt(scan, opportunities, diagnostics);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const aiResponse = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse AI response (expecting JSON)
    let recommendations;
    try {
      recommendations = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      recommendations = {
        summary: aiResponse,
        priority_issues: [],
        recommendations: [],
      };
    }

    // Store AI recommendations
    await sql`
      UPDATE performance_scans
      SET ai_recommendations = ${JSON.stringify(recommendations)},
          ai_analyzed_at = NOW(),
          status = 'completed',
          updated_at = NOW()
      WHERE id = ${scanId}
    `;

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    
    // Update status to failed
    if (scanId) {
      try {
        await sql`
          UPDATE performance_scans
          SET status = 'failed',
              error_message = ${error instanceof Error ? error.message : 'Analysis failed'},
              updated_at = NOW()
          WHERE id = ${scanId}
        `;
      } catch (dbError) {
        console.error('Failed to update scan status:', dbError);
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze scan' },
      { status: 500 }
    );
  }
}

function extractOpportunities(lighthouseResult: any) {
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
  ];

  for (const key of opportunityKeys) {
    const audit = audits[key];
    if (audit && audit.score !== null && audit.score < 1) {
      opportunities.push({
        id: key,
        title: audit.title,
        description: audit.description,
        score: Math.round((audit.score || 0) * 100),
        details: audit.details,
      });
    }
  }

  return opportunities;
}

function extractDiagnostics(lighthouseResult: any) {
  const diagnostics = [];
  const audits = lighthouseResult.audits;

  const diagnosticKeys = [
    'mainthread-work-breakdown',
    'bootup-time',
    'third-party-summary',
    'largest-contentful-paint-element',
    'layout-shift-elements',
  ];

  for (const key of diagnosticKeys) {
    const audit = audits[key];
    if (audit) {
      diagnostics.push({
        id: key,
        title: audit.title,
        description: audit.description,
        details: audit.details,
      });
    }
  }

  return diagnostics;
}

function buildAnalysisPrompt(scan: any, opportunities: any[], diagnostics: any[]) {
  return `You are a web performance expert analyzing a PageSpeed Insights report for an e-commerce website (The Equestrian).

**Scan Details:**
- Page Type: ${scan.page_type}
- URL: ${scan.page_url}
- Performance Score: ${scan.performance_score}/100
- Accessibility Score: ${scan.accessibility_score}/100
- Best Practices Score: ${scan.best_practices_score}/100
- SEO Score: ${scan.seo_score}/100

**Core Web Vitals:**
- First Contentful Paint (FCP): ${scan.fcp}s
- Largest Contentful Paint (LCP): ${scan.lcp}s
- Cumulative Layout Shift (CLS): ${scan.cls}
- Total Blocking Time (TBT): ${scan.tbt}ms
- Speed Index (SI): ${scan.si}s

**Top Opportunities:**
${opportunities.slice(0, 5).map((opp, i) => `${i + 1}. ${opp.title} (Score: ${opp.score}/100)\n   ${opp.description}`).join('\n\n')}

**Key Diagnostics:**
${diagnostics.slice(0, 5).map((diag, i) => `${i + 1}. ${diag.title}\n   ${diag.description}`).join('\n\n')}

**Your Task:**
Analyze this report and provide actionable recommendations with code examples. Focus on the most impactful changes.

**Response Format (JSON):**
{
  "summary": "Brief 2-3 sentence overview of the main issues",
  "priority_issues": [
    {
      "title": "Issue name",
      "severity": "high|medium|low",
      "impact": "Expected improvement description",
      "metric": "Which metric this affects (LCP, CLS, etc.)"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "priority": "high|medium|low",
      "category": "images|javascript|css|fonts|server|html",
      "description": "Detailed explanation of what to do",
      "code_example": "Actual code snippet to implement (if applicable)",
      "file_location": "Where to make this change (e.g., next.config.ts, _app.tsx)",
      "expected_impact": "Estimated improvement (e.g., 'Reduce LCP by 0.5s')",
      "implementation_notes": "Any important caveats or testing notes"
    }
  ]
}

**Important:**
- Provide specific Next.js 16 code examples where applicable
- Focus on quick wins first (high impact, low effort)
- Consider this is a Shopify headless storefront
- Be specific about file paths and implementation details
- Return ONLY valid JSON, no markdown formatting`;
}
