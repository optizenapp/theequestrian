# Custom Chat Widget Implementation

## Overview

Created a fully customizable chat UI that:
- ✅ Uses your Shopify Inbox settings (colors, greeting, position)
- ✅ Gives you complete control over the UI/UX
- ✅ Connects to `/apps/shopify-chat` proxy for backend
- ✅ Matches your brand perfectly

## Files Created

1. **`lib/chat/inbox-config.ts`** - Configuration management
   - Reads Shopify Inbox settings
   - Allows code-based overrides
   - Tries to read from existing widget

2. **`components/chat/CustomChatWidget.tsx`** - Main chat component
   - Custom UI matching your brand
   - Uses Shopify Inbox configuration
   - Connects to proxy API

3. **`lib/chat/shopify-chat-api.ts`** - API client
   - Sends/receives messages via proxy
   - Handles multiple endpoint patterns
   - Graceful fallbacks

4. **`types/chat.ts`** - TypeScript types

## Configuration

The widget uses your Shopify Inbox settings:

- **Background:** `#00B2A9` (Teal)
- **Text:** `#FFFFFF` (White)
- **Buttons:** `#6A6A6A` (Gray)
- **Position:** Right, Lowest
- **Greeting:** "👋 Hey. Welcome to The Equestrian..."

### Override via Environment Variables

You can override settings in `.env.local`:

```bash
NEXT_PUBLIC_CHAT_BACKGROUND_COLOR=#BD7AB3
NEXT_PUBLIC_CHAT_TEXT_COLOR=#FFFFFF
NEXT_PUBLIC_CHAT_BUTTON_COLOR=#5DBEBD
NEXT_PUBLIC_CHAT_GREETING_MESSAGE=Your custom message here
NEXT_PUBLIC_CHAT_HORIZONTAL_POSITION=right
NEXT_PUBLIC_CHAT_VERTICAL_POSITION=lowest
NEXT_PUBLIC_CHAT_ICON=chat-bubble
NEXT_PUBLIC_CHAT_LABEL=none
```

## Usage

### Option 1: Replace Shopify Inbox Widget

**File: `app/layout.tsx`**

```typescript
import { CustomChatWidget } from '@/components/chat/CustomChatWidget';
// Remove: import { ShopifyInbox } from '@/components/chat/ShopifyInbox';

// In body:
<CustomChatWidget /> // Instead of <ShopifyInbox />
```

### Option 2: Use Both (For Testing)

Keep both widgets temporarily to compare:

```typescript
<ShopifyInbox />
<CustomChatWidget />
```

## Next Steps

### 1. Test the Proxy Endpoint

The API client tries multiple endpoint patterns, but we should verify what actually works:

```bash
# Test from browser console on live site
fetch('/apps/shopify-chat')
  .then(r => r.text())
  .then(console.log)

fetch('/apps/shopify-chat/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ message: 'Test' })
})
  .then(r => r.json())
  .then(console.log)
```

### 2. Inspect Network Requests

1. Open DevTools → Network tab
2. Use the custom widget
3. Send a message
4. Look for requests to `/apps/shopify-chat/*`
5. Share the request/response structure

### 3. Update API Client

Once we know the actual API structure, update `lib/chat/shopify-chat-api.ts` with the correct endpoints and request/response formats.

### 4. Add Real-time Updates

Currently, the widget sends messages but doesn't receive responses in real-time. Options:

- **Polling:** Check for new messages every few seconds
- **WebSocket:** If proxy supports WebSocket connections
- **Server-Sent Events (SSE):** If proxy supports SSE

### 5. Enhance Features

- Typing indicators
- Read receipts
- File uploads
- Product link sharing
- Order tracking integration

## Current Status

✅ Custom UI component created  
✅ Configuration system in place  
✅ API client with fallbacks  
✅ Matches Shopify Inbox settings  
⏳ Needs proxy endpoint testing  
⏳ Needs real-time message receiving  

## Testing

1. **Add to layout:**
   ```typescript
   import { CustomChatWidget } from '@/components/chat/CustomChatWidget';
   // Add <CustomChatWidget /> to body
   ```

2. **Run dev server:**
   ```bash
   npm run dev
   ```

3. **Test the widget:**
   - Click the chat button
   - Send a test message
   - Check browser console for API errors
   - Check Network tab for proxy requests

4. **Compare with Shopify Inbox:**
   - Keep both widgets temporarily
   - Compare behavior
   - Once custom widget works, remove ShopifyInbox

## Troubleshooting

### Messages Not Sending

- Check browser console for errors
- Verify proxy endpoint exists: `fetch('/apps/shopify-chat')`
- Check Network tab for failed requests
- Verify cookies are being sent (`credentials: 'include'`)

### Configuration Not Loading

- Check `lib/chat/inbox-config.ts` for defaults
- Verify environment variables if overriding
- Check browser console for config errors

### Styling Issues

- Verify Tailwind classes are working
- Check if custom colors are applying
- Inspect element to see computed styles

## Future Enhancements

- [ ] Real-time message receiving (polling/WebSocket)
- [ ] Typing indicators
- [ ] Read receipts
- [ ] File upload support
- [ ] Product link sharing
- [ ] Order tracking integration
- [ ] Chat history persistence
- [ ] Multiple conversation support
- [ ] Admin interface for staff
