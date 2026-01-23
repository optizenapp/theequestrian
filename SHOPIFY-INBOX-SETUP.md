# Shopify Inbox Integration Setup Guide

## Overview

Shopify Inbox chat widget has been integrated into your headless Next.js storefront. This guide will help you complete the setup.

## What Was Implemented

### Components Created

1. **`components/chat/ShopifyInbox.tsx`** - Main widget component that loads the Shopify Inbox script
2. **`components/chat/ChatButton.tsx`** - Optional custom chat button component for programmatic triggers
3. **`lib/chat/inbox-controls.ts`** - Utility functions for programmatic chat control
4. **`types/shopify-inbox.ts`** - TypeScript definitions for Shopify Chat API

### Files Modified

1. **`app/layout.tsx`** - Added ShopifyInbox component to root layout
2. **`lib/env.ts`** - Added Shopify Inbox environment variables

## Setup Steps

### Step 1: Enable Shopify Inbox in Theme

1. Go to **Shopify Admin** → **Online Store** → **Themes**
2. Click **Customize** next to your published theme
3. In the left sidebar, click **App embeds**
4. Find **Shopify Inbox** and toggle it **ON**
5. Click **Save** in the top right

### Step 2: Extract Script URL

1. While still in the theme customizer, click **Preview** (or open your live store)
2. Open browser **DevTools** (F12 or Cmd+Option+I)
3. Go to the **Elements** tab (or **Inspector**)
4. Press **Cmd+F** (Mac) or **Ctrl+F** (Windows) to search
5. Search for: `shopifyChatV1.js`
6. You should find a `<script>` tag like:
   ```html
   <script src="https://cdn.shopify.com/extensions/.../shopifyChatV1Widget.js"></script>
   ```
   Or you may see it in the Network tab as:
   ```
   https://cdn.shopify.com/extensions/e8878072-2f6b-4e89-8082-94b04320908d/inbox-1254/assets/shopifyChatV1Widget.js
   ```
7. **Copy the entire URL** from the `src` attribute or Network tab

### Step 3: Add Environment Variables

Add the script URL to your environment variables:

**`.env.local` (for local development):**
```bash
# Shopify Inbox Configuration
NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL=https://cdn.shopify.com/extensions/e8878072-2f6b-4e89-8082-94b04320908d/inbox-1254/assets/shopifyChatV1Widget.js
SHOPIFY_INBOX_ENABLED=true
```

**Vercel Environment Variables (for production):**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL` = (your script URL)
   - `SHOPIFY_INBOX_ENABLED` = `true`
4. Click **Save**
5. **Redeploy** your site

### Step 4: Customize Widget Appearance

In Shopify Admin:

1. Go to **Online Store** → **Themes** → **Customize**
2. Click **App embeds** → **Shopify Inbox**
3. Customize:
   - **Button colors** - Match your brand
   - **Icon** - Choose from available options
   - **Label** - "Chat", "Help", "Contact", etc.
   - **Position** - Bottom-right recommended
   - **Greeting message** - Custom welcome message

4. Click **Save**

### Step 5: Configure Business Hours & Staff

1. Go to **Shopify Admin** → **Apps** → **Shopify Inbox**
2. Configure:
   - **Business hours** - When chat is available
   - **Auto-responses** - Messages for off-hours
   - **Staff assignments** - Who handles chats
   - **Notifications** - Email/SMS alerts

## Usage

### Default Widget

The widget will automatically appear on all pages once configured. Customers can click the chat button to start a conversation.

### Programmatic Control

You can trigger the chat widget programmatically from anywhere in your app:

```tsx
import { openShopifyChat, closeShopifyChat, toggleShopifyChat } from '@/lib/chat/inbox-controls';

// Open chat
<button onClick={openShopifyChat}>
  Chat with us
</button>

// Close chat
<button onClick={closeShopifyChat}>
  Close
</button>

// Toggle chat
<button onClick={toggleShopifyChat}>
  Toggle chat
</button>
```

### Custom Chat Button Component

Use the pre-built ChatButton component:

```tsx
import { ChatButton } from '@/components/chat/ChatButton';

// Simple usage
<ChatButton />

// Custom styling
<ChatButton 
  label="Need help?"
  variant="outline"
  size="lg"
/>

// Icon-only button
<ChatButton 
  variant="icon"
  label=""
/>
```

**Available Props:**
- `label` - Button text (default: "Chat with us")
- `variant` - "default" | "outline" | "ghost" | "icon"
- `size` - "sm" | "default" | "lg"
- `showIcon` - Show chat icon (default: true)
- `className` - Custom CSS classes

### Adding Chat Button to Header/Footer

**Header Example:**
```tsx
// components/header/Header.tsx
import { ChatButton } from '@/components/chat/ChatButton';

export function Header() {
  return (
    <header>
      {/* Your header content */}
      <ChatButton variant="ghost" size="sm" />
    </header>
  );
}
```

**Footer Example:**
```tsx
// components/footer/Footer.tsx
import { ChatButton } from '@/components/chat/ChatButton';

export function Footer() {
  return (
    <footer>
      {/* Your footer content */}
      <ChatButton label="Questions? Chat with us" />
    </footer>
  );
}
```

## Testing

### Checklist

- [ ] Widget appears on homepage
- [ ] Widget appears on product pages
- [ ] Widget appears on collection pages
- [ ] Chat opens when clicking widget button
- [ ] Chat closes when clicking close button
- [ ] Programmatic `openShopifyChat()` works
- [ ] Programmatic `closeShopifyChat()` works
- [ ] Widget works on mobile devices
- [ ] Widget doesn't conflict with cart drawer or modals
- [ ] Messages appear in Shopify Inbox admin
- [ ] Staff can respond from Shopify admin
- [ ] Auto-responses work correctly
- [ ] Business hours are respected

### Testing Programmatic Controls

Open browser console and test:

```javascript
// Check if widget is loaded
window.ShopifyChat

// Open chat
window.ShopifyChat.open()

// Close chat
window.ShopifyChat.close()
```

## Troubleshooting

### Widget Doesn't Appear

**Problem:** Chat widget not showing on pages

**Solutions:**
1. Verify `NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL` is set correctly
2. Check browser console for errors
3. Verify Shopify Inbox is enabled in theme customizer
4. Ensure script URL is correct (check DevTools Network tab)
5. Clear browser cache and hard refresh (Cmd+Shift+R)

### Script URL Not Found

**Problem:** Can't find `shopifyChatV1.js` in theme preview

**Solutions:**
1. Ensure Shopify Inbox is enabled in App embeds
2. Make sure you're previewing the **published** theme
3. Check that Shopify Inbox app is installed
4. Try searching for "shopify" or "chat" instead

### Widget Loads But Doesn't Open

**Problem:** Widget appears but clicking doesn't open chat

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify `window.ShopifyChat` exists in console
3. Try programmatic control: `window.ShopifyChat.open()`
4. Check if ad blockers are interfering
5. Test in incognito/private mode

### Widget Conflicts with Site Styles

**Problem:** Widget styling conflicts with your site

**Solutions:**
1. Customize widget appearance in Shopify admin
2. Use CSS to override widget styles if needed:
   ```css
   /* Override widget z-index if needed */
   #shopify-chat {
     z-index: 9999 !important;
   }
   ```
3. Ensure widget doesn't overlap with cart drawer or modals

### Messages Not Appearing in Admin

**Problem:** Customers send messages but they don't appear in Shopify Inbox

**Solutions:**
1. Check Shopify Inbox app is installed and active
2. Verify staff permissions in Shopify admin
3. Check notification settings
4. Look for messages in Shopify Admin → Apps → Shopify Inbox

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL` | Yes | Full URL to shopifyChatV1.js script |
| `SHOPIFY_INBOX_ENABLED` | No | Enable/disable widget (default: true if script URL exists) |

## Performance Considerations

- Widget script loads with `lazyOnload` strategy (loads after page is interactive)
- Script only loads if `NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL` is configured
- Widget is client-side only (no SSR impact)
- Minimal performance impact on page load

## Security Notes

- Script URL is public (NEXT_PUBLIC_ prefix)
- Widget is loaded from Shopify CDN (trusted source)
- No sensitive data is exposed
- Chat messages are handled by Shopify Inbox service

## Next Steps

1. **Monitor Usage:** Track chat volume and response times
2. **Set Up Notifications:** Configure email/SMS alerts for new messages
3. **Create Templates:** Set up quick replies for common questions
4. **Add Context:** Consider passing product/cart context to chat (if API supports)
5. **Analytics:** Track chat interactions if needed
6. **A/B Testing:** Test different button placements and labels

## Support

- **Shopify Inbox Docs:** https://help.shopify.com/en/manual/inbox
- **Shopify Community:** https://community.shopify.com/
- **Component Code:** `components/chat/ShopifyInbox.tsx`
- **Control Utilities:** `lib/chat/inbox-controls.ts`

---

**Status:** ✅ Implementation complete. Follow setup steps above to enable.
