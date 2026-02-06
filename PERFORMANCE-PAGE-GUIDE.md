# Performance Page - Implementation Guide

## Overview

The Performance page in the admin dashboard allows you to run PageSpeed Insights scans on different page types and get AI-powered recommendations for improving site performance.

## Features

### 1. **PageSpeed Insights Integration**
- Run performance scans on any page type (homepage, collections, products, etc.)
- Get detailed metrics:
  - Performance Score (0-100)
  - Accessibility Score (0-100)
  - Best Practices Score (0-100)
  - SEO Score (0-100)
- View Core Web Vitals:
  - First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP)
  - Cumulative Layout Shift (CLS)
  - Total Blocking Time (TBT)
  - Speed Index (SI)

### 2. **AI-Powered Recommendations**
- Click "Analyze with AI" to get Claude's analysis
- Receive prioritized recommendations with:
  - Code examples you can copy/paste
  - File locations where changes should be made
  - Expected performance impact
  - Implementation notes and caveats

### 3. **Scan History**
- View past scans
- Compare performance over time
- Track improvements after implementing changes

## Setup Instructions

### 1. Initialize the Database Table

Run the initialization script to create the `performance_scans` table:

```bash
npm run performance:init
```

This will create the necessary database schema in your Neon PostgreSQL database.

### 2. (Optional) Add PageSpeed API Key

For higher rate limits, add a PageSpeed Insights API key to your `.env` file:

```env
PAGESPEED_API_KEY=your_api_key_here
```

**Get your API key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the PageSpeed Insights API
3. Create credentials (API key)
4. Add it to your `.env` file

**Rate Limits:**
- Without API key: 25 requests/day
- With API key: 25,000 requests/day (free tier)

### 3. Access the Performance Page

Navigate to `/admin/performance` in your admin dashboard.

## How to Use

### Running a Scan

1. **Select Page Type:**
   - Homepage
   - Collection Page (e.g., /horse)
   - Subcollection Page (e.g., /horse/boots)
   - Product Page
   - Brand Page
   - On Sale Page
   - Custom URL (enter any URL)

2. **Click "Run Scan":**
   - Scan takes 30-60 seconds
   - Results display automatically

3. **Review Scores:**
   - Green (90-100): Good
   - Yellow (50-89): Needs improvement
   - Red (0-49): Poor

### Getting AI Recommendations

1. **After scan completes, click "Analyze with AI"**
2. **Review the analysis:**
   - Summary of main issues
   - Priority issues ranked by severity
   - Detailed recommendations with code

3. **Click on any recommendation to see:**
   - Full description
   - Code example (with copy button)
   - File location
   - Expected impact
   - Implementation notes

### Implementing Recommendations

**IMPORTANT: Safe Implementation Process**

1. **Review the recommendation carefully**
2. **Copy the code snippet**
3. **Test in your local development environment first**
4. **Make changes in the specified files**
5. **Run local tests to ensure nothing breaks**
6. **Commit changes to git**
7. **Deploy to staging (if available)**
8. **Test thoroughly before production**

**DO NOT:**
- ❌ Apply changes directly to production without testing
- ❌ Copy/paste code without understanding it
- ❌ Skip testing after making changes
- ❌ Ignore implementation notes

## Architecture

### Database Schema

```sql
CREATE TABLE performance_scans (
  id SERIAL PRIMARY KEY,
  page_type VARCHAR(100) NOT NULL,
  page_url TEXT NOT NULL,
  scan_date TIMESTAMP DEFAULT NOW(),
  performance_score INT,
  accessibility_score INT,
  best_practices_score INT,
  seo_score INT,
  fcp DECIMAL(10, 2),
  lcp DECIMAL(10, 2),
  cls DECIMAL(10, 4),
  tbt DECIMAL(10, 2),
  si DECIMAL(10, 2),
  raw_data JSONB,
  ai_recommendations JSONB,
  ai_analyzed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'completed',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### API Routes

1. **POST /api/admin/performance/scan**
   - Runs PageSpeed Insights scan
   - Stores results in database
   - Returns scan data with opportunities and diagnostics

2. **POST /api/admin/performance/analyze**
   - Sends scan data to Claude AI
   - Generates prioritized recommendations
   - Stores AI analysis in database

3. **GET /api/admin/performance/history**
   - Fetches recent scans
   - Optional filtering by page type

4. **GET /api/admin/performance/[id]**
   - Fetches specific scan details
   - Includes AI recommendations if available

5. **DELETE /api/admin/performance/[id]**
   - Deletes a scan record

### Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Neon PostgreSQL (via @vercel/postgres)
- **APIs:**
  - PageSpeed Insights API (Google)
  - Claude API (Anthropic)

## Cost Considerations

### PageSpeed Insights API
- **Free tier:** 25,000 requests/day
- **Cost:** Free
- **Recommendation:** Get an API key for higher limits

### Claude API (Anthropic)
- **Model:** claude-3-5-sonnet-20241022
- **Cost per analysis:** ~$0.01-0.05 (depending on report size)
- **Tokens:** ~4,000 max tokens per response
- **Recommendation:** Use sparingly, only when needed

### Database Storage
- **Storage per scan:** ~50-100 KB (raw PageSpeed data + AI recommendations)
- **Cost:** Negligible (included in Neon free tier)

## Best Practices

### When to Run Scans

✅ **Good times to scan:**
- After deploying performance optimizations
- Before major releases
- Weekly/monthly performance audits
- When investigating user complaints about speed

❌ **Avoid scanning:**
- Multiple times per day (wastes API quota)
- During active development (results will be inconsistent)
- On localhost (scan production URLs only)

### Interpreting Results

**Performance Score Targets:**
- **90-100:** Excellent (maintain this)
- **50-89:** Good, but room for improvement
- **0-49:** Poor, needs immediate attention

**Core Web Vitals Targets:**
- **LCP:** < 2.5s (good), 2.5-4s (needs improvement), > 4s (poor)
- **FCP:** < 1.8s (good), 1.8-3s (needs improvement), > 3s (poor)
- **CLS:** < 0.1 (good), 0.1-0.25 (needs improvement), > 0.25 (poor)

### Common Optimizations

The AI will typically recommend:

1. **Image Optimization**
   - Use Next.js Image component
   - Convert to WebP/AVIF formats
   - Lazy load offscreen images
   - Add proper width/height attributes

2. **JavaScript Optimization**
   - Remove unused JavaScript
   - Code splitting
   - Defer non-critical scripts
   - Tree shaking

3. **CSS Optimization**
   - Remove unused CSS
   - Inline critical CSS
   - Defer non-critical CSS

4. **Font Optimization**
   - Use font-display: swap
   - Preload critical fonts
   - Subset fonts

5. **Server Optimization**
   - Enable compression
   - Set proper cache headers
   - Use CDN for static assets

## Troubleshooting

### "PageSpeed API error"
- Check your internet connection
- Verify the URL is publicly accessible
- Check API key (if using one)
- Wait a few minutes and try again (rate limit)

### "Analysis failed"
- Check ANTHROPIC_API_KEY in .env
- Verify you have API credits
- Check console logs for detailed error

### "Scan not found"
- Database connection issue
- Run `npm run performance:init` to ensure table exists

### Slow scan times
- Normal: PageSpeed scans take 30-60 seconds
- If longer: Check your internet connection
- If timeout: The page might be too slow or unreachable

## Security & Safety

### ✅ Safe Design
- **Read-only scanning:** No changes made to your site
- **Manual implementation:** You review and apply all changes
- **Version control:** All changes go through git
- **Testing required:** Changes must be tested locally first

### ⚠️ Important Warnings
- AI recommendations are suggestions, not guaranteed fixes
- Always test changes in development first
- Some recommendations may not apply to your specific setup
- Code examples may need adjustment for your codebase

## Future Enhancements

Potential improvements for v2:

- [ ] Automated scheduling (daily/weekly scans)
- [ ] Performance budgets and alerts
- [ ] Comparison view (before/after)
- [ ] Export reports as PDF
- [ ] Integration with CI/CD pipeline
- [ ] Mobile vs Desktop comparison
- [ ] Historical trend charts
- [ ] Slack/email notifications for score drops

## Support

If you encounter issues:

1. Check the console logs in your browser
2. Check the server logs in Vercel
3. Verify all environment variables are set
4. Ensure database table is initialized
5. Check API quotas and credits

## Related Documentation

- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
