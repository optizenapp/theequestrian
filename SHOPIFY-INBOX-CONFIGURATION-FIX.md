# Shopify Inbox Configuration Fix

## The Problem

Your Shopify Inbox app embed settings (colors, greeting message) are configured in Shopify Admin, but they **don't appear in your headless frontend**.

**Root Cause:** The widget script needs to know which shop's configuration to load. Without the shop parameter, it uses default settings instead of your customized ones.

## The Solution

Add the `shop` parameter to the widget script URL so it loads YOUR configuration from Shopify Admin.

### Updated Component

`CustomizedShopifyInbox.tsx` now:
1. Reads your shop domain from environment variables
2. Appends `?shop=theequestrian.myshopify.com` to the script URL
3. Widget loads with YOUR Shopify Admin settings

### Environment Variables Needed

Add to `.env.local`:

```bash
# Shopify Store
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=theequestrian.myshopify.com

# Shopify Inbox Widget
NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL=https://cdn.shopify.com/extensions/e8878072-2f6b-4e89-8082-94b04320908d/inbox-1254/assets/shopifyChatV1Widget.js
SHOPIFY_INBOX_ENABLED=true
```

### How It Works

**Before:**
```
https://cdn.shopify.com/.../shopifyChatV1Widget.js
↓
Loads default configuration (no shop context)
```

**After:**
```
https://cdn.shopify.com/.../shopifyChatV1Widget.js?shop=theequestrian.myshopify.com
↓
Loads YOUR configuration from Shopify Admin
```

## What This Fixes

✅ Widget loads with YOUR colors from Shopify Admin  
✅ Widget loads with YOUR greeting message  
✅ Widget loads with YOUR position settings  
✅ Widget loads with YOUR icon/label choices  
✅ No need for CSS/JS overrides  

## Testing

1. Add `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` to `.env.local`
2. Restart dev server: `npm run dev`
3. Open chat widget
4. Should now show YOUR Shopify Admin settings

## Verification

Check browser console for:
```
📝 Loading Shopify Inbox with shop: theequestrian.myshopify.com
📝 Script URL: https://cdn.shopify.com/.../shopifyChatV1Widget.js?shop=theequestrian.myshopify.com
```

## If It Still Doesn't Work

The widget might need additional parameters. Check your live site's Network tab:
1. Open DevTools → Network
2. Filter for `shopifyChatV1Widget.js`
3. Check the full URL with all query parameters
4. Copy the exact URL format

Common parameters:
- `?shop=your-store.myshopify.com`
- `&locale=en`
- `&version=1.0`

Let me know if this fixes it!
