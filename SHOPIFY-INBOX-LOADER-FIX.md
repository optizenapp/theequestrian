# Shopify Inbox Loader Fix

## The Real Problem

You were loading `shopifyChatV1Widget.js` directly, but Shopify Inbox needs the **loader script** first:

```
inbox-chat-loader.js  ← This loads your configuration
    ↓
shopifyChatV1Widget.js  ← This is loaded by the loader
    ↓
Your Shopify Admin settings applied
```

## The Fix

Changed the component to load `inbox-chat-loader.js` instead of `shopifyChatV1Widget.js`.

### Updated Script URL

**Before:**
```
https://cdn.shopify.com/.../shopifyChatV1Widget.js
```

**After:**
```
https://cdn.shopify.com/.../inbox-chat-loader.js
```

## Update Your Environment Variable

Change your `.env.local`:

```bash
# OLD (wrong):
NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL=https://cdn.shopify.com/extensions/e8878072-2f6b-4e89-8082-94b04320908d/inbox-1254/assets/shopifyChatV1Widget.js

# NEW (correct):
NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL=https://cdn.shopify.com/extensions/e8878072-2f6b-4e89-8082-94b04320908d/inbox-1254/assets/inbox-chat-loader.js

# Also add:
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=theequestrian.myshopify.com
```

## How It Works

1. **Loader script** loads first
2. Loader reads your shop's Shopify Admin configuration
3. Loader loads the widget with YOUR settings
4. Widget displays with YOUR colors and greeting

## Test It

1. Update `.env.local` with the loader URL
2. Restart dev server: `npm run dev`
3. Open chat widget
4. Should now show YOUR Shopify Admin settings!

## Expected Result

✅ Background: `#00B2A9` (from Shopify Admin)  
✅ Greeting: "👋 Hey. Welcome to The Equestrian..." (from Shopify Admin)  
✅ All your configured settings  

The `CustomizedShopifyInbox` component will still apply overrides if you want different colors than what's in Shopify Admin.
