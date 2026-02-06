# Setup PageSpeed Insights API Key

## Quick Setup (5 minutes)

### Step 1: Enable PageSpeed Insights API

1. Visit: https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com?project=iron-potion-486301-i7
2. Click **"Enable"** button
3. Wait for confirmation (usually instant)

### Step 2: Create API Key

1. Visit: https://console.cloud.google.com/apis/credentials?project=iron-potion-486301-i7
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the API key that appears
4. Click **"Restrict Key"** (important for security)

### Step 3: Restrict API Key (Security)

In the API Key settings:

1. **Name:** Give it a descriptive name (e.g., "PageSpeed Insights - The Equestrian")

2. **API Restrictions:**
   - Select **"Restrict key"**
   - Check only: **"PageSpeed Insights API"**
   - Click **"Save"**

3. **Application Restrictions (Optional but Recommended):**
   - Select **"HTTP referrers (web sites)"**
   - Add your domain: `*.theequestrian.com.au/*`
   - Add Vercel preview: `*.vercel.app/*`
   - Click **"Save"**

### Step 4: Add to Environment Variables

1. **Local Development:**
   Add to your `.env` file:
   ```env
   PAGESPEED_API_KEY=your_api_key_here
   ```

2. **Vercel Production:**
   - Go to: https://vercel.com/jonosmmachine/theequestrian/settings/environment-variables
   - Add new variable:
     - **Name:** `PAGESPEED_API_KEY`
     - **Value:** Your API key
     - **Environment:** Production, Preview, Development
   - Click **"Save"**

3. **Redeploy (if needed):**
   - Vercel will automatically redeploy
   - Or trigger manually: `git commit --allow-empty -m "Add PageSpeed API key" && git push`

### Step 5: Verify It Works

1. Navigate to `/admin/performance`
2. Run a scan
3. Check the Network tab in browser DevTools
4. Look for the PageSpeed API request - it should include `key=your_api_key`

## Rate Limits

### Without API Key
- **Limit:** 25 requests per day (per IP address)
- **Cost:** FREE
- **Good for:** Testing, low-volume usage

### With API Key
- **Limit:** 25,000 requests per day
- **Cost:** FREE (no charges)
- **Good for:** Production use, regular monitoring

## Troubleshooting

### "API key not valid"
- Check that PageSpeed Insights API is enabled
- Verify the API key is correct in .env
- Check API key restrictions (make sure PageSpeed Insights API is allowed)

### "API key restrictions don't allow this referrer"
- Add your domain to HTTP referrer restrictions
- Or temporarily remove application restrictions for testing

### "Quota exceeded"
- You've hit the daily limit (25 or 25,000 requests)
- Wait until tomorrow (resets at midnight Pacific Time)
- Or create a new API key (not recommended)

## Security Best Practices

✅ **DO:**
- Restrict API key to only PageSpeed Insights API
- Add HTTP referrer restrictions
- Keep API key in environment variables
- Rotate API key periodically (every 90 days)

❌ **DON'T:**
- Commit API key to git
- Share API key publicly
- Use same API key for multiple projects
- Leave API key unrestricted

## Cost Information

**PageSpeed Insights API is completely FREE:**
- No charges for any number of requests
- 25,000 requests/day limit (with API key)
- No billing account required
- No credit card needed

## Alternative: Use Without API Key

The Performance page **works without an API key**!

**Pros:**
- No setup required
- Already working

**Cons:**
- Only 25 requests/day
- Shared quota with other users on same IP
- May hit limits faster

**Recommendation:** Get the API key - it takes 5 minutes and gives you 1,000x more quota.

## Summary

1. ✅ Enable PageSpeed Insights API in your project
2. ✅ Create API key
3. ✅ Restrict to PageSpeed Insights API only
4. ✅ Add to .env and Vercel
5. ✅ Test in /admin/performance

**Total time:** ~5 minutes  
**Cost:** FREE  
**Benefit:** 25,000 requests/day instead of 25

---

**Your existing service accounts are perfect for GA4 and GSC, but PageSpeed needs a simple API key.**
