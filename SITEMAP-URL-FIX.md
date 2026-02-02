# Sitemap URL Fix

## Issue
Sitemaps are pointing to `localhost:3001` instead of production domain.

## Root Cause
The `NEXT_PUBLIC_SITE_URL` environment variable in Vercel is set to `http://localhost:3001`.

## Fix Applied Locally
Updated both `.env` and `.env.local`:
```
NEXT_PUBLIC_SITE_URL="https://www.theequestrian.com.au"
```

## Action Required in Vercel
You need to update the environment variable in Vercel dashboard:

1. Go to https://vercel.com/jono-silicondaless-projects/theequestrian/settings/environment-variables
2. Find `NEXT_PUBLIC_SITE_URL`
3. Update value to: `https://www.theequestrian.com.au`
4. Apply to all environments (Production, Preview, Development)
5. Redeploy the site

## Verification
After redeployment, check:
- https://www.theequestrian.com.au/sitemap.xml
- All URLs should be `https://www.theequestrian.com.au/...` instead of `localhost:3001`

## Status
✅ Environment variable updated in Vercel
🚀 Deploying to apply changes...

## Files That Use This Variable
- `app/sitemap.ts` - Main sitemap index
- All sub-sitemaps in `app/sitemap/` folder
- Any absolute URL generation in the app
