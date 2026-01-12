# Redirect Testing Guide

Complete guide to testing redirects before DNS cutover to the headless store.

## Testing Methods

### Method 1: Vercel Preview URL (Recommended)

**Your Vercel URL**: Check your Vercel dashboard for the production URL
- Format: `https://theequestrian-xxx.vercel.app`
- Or custom domain if already configured

**Test redirects**:
```bash
# Test a redirect
curl -I https://your-vercel-url.vercel.app/collections/saddles

# Expected output:
HTTP/2 301
location: /horse/saddles
```

**In Browser**:
1. Visit: `https://your-vercel-url.vercel.app/collections/saddles`
2. Should redirect to: `https://your-vercel-url.vercel.app/horse/saddles`

---

### Method 2: Local Testing

**Start dev server**:
```bash
npm run dev
```

**Test redirects locally**:
```bash
# Test with curl
curl -I http://localhost:3000/collections/saddles

# Expected output:
HTTP/1.1 301 Moved Permanently
Location: /horse/saddles
```

**In Browser**:
1. Visit: `http://localhost:3000/collections/saddles`
2. Should redirect to: `http://localhost:3000/horse/saddles`

---

### Method 3: Hosts File Override (Test with Real Domain)

**Edit hosts file** to point your domain to Vercel temporarily:

**On Mac/Linux**:
```bash
sudo nano /etc/hosts
```

**On Windows**:
```
C:\Windows\System32\drivers\etc\hosts
```

**Add line**:
```
76.76.21.21  theequestrian.com.au
76.76.21.21  www.theequestrian.com.au
```

**Get Vercel IP**:
```bash
# Find Vercel's IP for your deployment
nslookup your-vercel-url.vercel.app
```

**Test**:
1. Visit: `http://theequestrian.com.au/collections/saddles`
2. Should redirect to: `http://theequestrian.com.au/horse/saddles`

**Important**: Remove hosts file entry after testing!

---

### Method 4: Automated Redirect Testing Script

Create a test script to verify all redirects:

**File**: `scripts/test-redirects.ts`

```typescript
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
    console.error('❌', from, '→ ERROR:', error.message);
    return false;
  }
}

async function testAllRedirects() {
  console.log('🧪 Testing redirects...\n');
  
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
  
  process.exit(failed > 0 ? 1 : 0);
}

testAllRedirects();
```

**Add to package.json**:
```json
{
  "scripts": {
    "test:redirects": "tsx scripts/test-redirects.ts",
    "test:redirects:prod": "TEST_URL=https://your-vercel-url.vercel.app tsx scripts/test-redirects.ts"
  }
}
```

**Run tests**:
```bash
# Test locally
npm run test:redirects

# Test on Vercel
npm run test:redirects:prod
```

---

## Sample Redirects to Test

### High Priority (Must Work)

```bash
# Product categories
curl -I https://your-url/collections/saddles
curl -I https://your-url/collections/breeches
curl -I https://your-url/collections/stirrups

# Expected: 301 → /horse/saddles, /clothing/womens/breeches, /horse/tack/stirrups
```

### With Query Parameters

```bash
# Test query parameter preservation
curl -I "https://your-url/collections/saddles?sort=price"

# Expected: 301 → /horse/saddles?sort=price
```

### Nested Collections

```bash
# Test subcategory redirects
curl -I https://your-url/collections/saddles/jumping
curl -I https://your-url/collections/breeches/high-waisted

# Expected: 301 → correct nested URLs
```

---

## Browser Testing Checklist

### Before DNS Change

- [ ] Test 10-20 sample redirects on Vercel preview URL
- [ ] Verify 301 status codes (use browser DevTools Network tab)
- [ ] Check query parameters are preserved
- [ ] Test on mobile and desktop
- [ ] Verify no redirect loops
- [ ] Check redirect speed (should be instant)

### DevTools Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Visit: `https://your-vercel-url.vercel.app/collections/saddles`
4. Check:
   - Status: `301 Moved Permanently`
   - Location header: `/horse/saddles`
   - Redirect happens immediately

---

## Bulk Testing Tool

**Quick test script**:

```bash
#!/bin/bash
# test-sample-redirects.sh

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Testing redirects on: $BASE_URL"
echo ""

# Test sample redirects
test_redirect() {
  local from=$1
  local expected=$2
  
  local response=$(curl -s -I -w "%{http_code}" -o /dev/null "$BASE_URL$from")
  local location=$(curl -s -I "$BASE_URL$from" | grep -i "location:" | cut -d' ' -f2 | tr -d '\r')
  
  if [ "$response" = "301" ] && [ "$location" = "$expected" ]; then
    echo "✅ $from → $location"
  else
    echo "❌ $from → $location (expected: $expected, got: $response)"
  fi
}

# Test redirects
test_redirect "/collections/saddles" "/horse/saddles"
test_redirect "/collections/breeches" "/clothing/womens/breeches"
test_redirect "/collections/stirrups" "/horse/tack/stirrups"
test_redirect "/collections/footwear" "/clothing/footwear"
test_redirect "/collections/gifts" "/accessories/gifts"
test_redirect "/collections/horse-rugs" "/horse/rugs"
test_redirect "/collections/body-protectors" "/rider/body-protectors"
test_redirect "/collections/horse-boots" "/horse/boots"
test_redirect "/collections/luggage" "/rider/luggage"
test_redirect "/collections/birds" "/pet/bird"

echo ""
echo "✅ Testing complete!"
```

**Usage**:
```bash
# Test locally
chmod +x test-sample-redirects.sh
./test-sample-redirects.sh

# Test on Vercel
./test-sample-redirects.sh https://your-vercel-url.vercel.app
```

---

## Google Search Console Testing

**After DNS change**, verify redirects in Google Search Console:

1. Go to **Coverage** report
2. Check for **Redirect** status
3. Verify old URLs are being redirected
4. Monitor for 404 errors

---

## Monitoring After DNS Change

### Week 1 Checklist

- [ ] Monitor 404 errors in Vercel Analytics
- [ ] Check Google Search Console for crawl errors
- [ ] Review server logs for redirect patterns
- [ ] Test high-traffic collection URLs
- [ ] Verify search rankings maintained

### Tools

**Vercel Analytics**:
- Monitor 404 error rate
- Check redirect response times
- View top redirected URLs

**Google Search Console**:
- Coverage report
- URL inspection tool
- Performance report

---

## Troubleshooting

### Redirect Not Working

**Check**:
1. Is redirect in `redirects/collections.csv`?
2. Did you run `npm run redirects:generate`?
3. Is `lib/redirects/maps.ts` updated?
4. Is middleware.ts configured correctly?
5. Clear browser cache

### Wrong Redirect Destination

**Fix**:
1. Update `redirects/collections.csv`
2. Run `npm run redirects:generate`
3. Commit and push
4. Redeploy to Vercel

### Redirect Loop

**Check**:
1. Ensure `from` and `to` are different
2. Verify no circular redirects
3. Check middleware logic

---

## Pre-Launch Final Test

**Before DNS cutover**:

```bash
# 1. Deploy to Vercel
git push origin main

# 2. Wait for deployment
vercel --prod

# 3. Test on Vercel URL
./test-sample-redirects.sh https://your-vercel-url.vercel.app

# 4. Manual browser test
# Visit 10-20 collection URLs on Vercel

# 5. Check all pass
# ✅ All redirects working? → Safe to change DNS
```

---

## DNS Cutover Checklist

- [ ] All redirects tested on Vercel preview URL
- [ ] Sample redirects work correctly
- [ ] Query parameters preserved
- [ ] No redirect loops
- [ ] 301 status codes confirmed
- [ ] Mobile and desktop tested
- [ ] Ready to change DNS at Shopify

**Next**: Update DNS A record to point to Vercel IP
