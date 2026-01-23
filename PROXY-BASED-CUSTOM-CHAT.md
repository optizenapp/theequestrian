# Custom Chat UI Using Shopify Chat Proxy

## Discovery

Found proxy endpoint: `https://www.theequestrian.com.au/apps/shopify-chat`

This proxy endpoint may expose APIs we can use to build a custom chat UI while still connecting to Shopify Inbox's backend.

**Related:** Shopify also has a [Chat component for checkout extensions](https://shopify.dev/docs/api/checkout-ui-extensions/2024-10/components/overlays/chat) that uses an iframe pattern. We can adapt this pattern for the main storefront by hosting our own chat application and embedding it via iframe, then connecting to the proxy endpoint.

## Investigation Plan

### Step 1: Explore the Proxy Endpoint

We've created utilities to explore what the proxy endpoint exposes:

**Files Created:**
- `lib/chat/shopify-chat-proxy.ts` - Client for interacting with proxy
- `app/api/chat/explore-proxy/route.ts` - API route to explore proxy
- `components/chat/ProxyExplorer.tsx` - Dev tool to test proxy endpoints

**How to Use:**

1. **Via API Route:**
   ```bash
   curl http://localhost:3000/api/chat/explore-proxy
   ```

2. **Via Component (Dev Only):**
   Add `<ProxyExplorer />` to a page temporarily to test endpoints interactively

3. **Direct Testing:**
   ```typescript
   import { exploreShopifyChatProxy } from '@/lib/chat/shopify-chat-proxy';
   const results = await exploreShopifyChatProxy();
   ```

### Step 2: Discover API Structure

The proxy endpoint might expose:

- **GET `/apps/shopify-chat`** - Base endpoint, might return config
- **GET `/apps/shopify-chat/api`** - API root
- **GET `/apps/shopify-chat/messages`** - Get messages
- **POST `/apps/shopify-chat/send`** - Send message
- **GET `/apps/shopify-chat/conversations`** - Get conversations
- **GET `/apps/shopify-chat/config`** - Get chat configuration

### Step 3: Inspect Network Requests

**On Live Site:**
1. Open DevTools → Network tab
2. Open Shopify Inbox chat widget
3. Send a test message
4. Look for requests to `/apps/shopify-chat/*`
5. Note the request/response structure

**What to Look For:**
- Request methods (GET, POST, etc.)
- Request headers (authentication, content-type)
- Request body structure
- Response format (JSON, HTML, etc.)
- Authentication mechanism (cookies, tokens, etc.)

### Step 4: Build Custom UI Based on Discovered APIs

Once we understand the API structure, we can:

1. **Create Custom Chat Component**
   - Match your brand design
   - Use discovered API endpoints
   - Handle authentication automatically (cookies)

2. **Features:**
   - Send/receive messages via proxy
   - Display conversation history
   - Custom greeting message (from config or override)
   - Typing indicators (if API supports)
   - Real-time updates (polling or WebSocket if available)

## Implementation Strategy

### Option A: Proxy Exposes REST API

If the proxy exposes REST endpoints:

```typescript
// lib/chat/shopify-chat-api.ts
export async function sendMessage(message: string) {
  return fetch('/apps/shopify-chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    credentials: 'include',
  });
}

export async function getMessages(conversationId: string) {
  return fetch(`/apps/shopify-chat/messages?conversation=${conversationId}`, {
    credentials: 'include',
  });
}
```

### Option B: Proxy Exposes GraphQL

If the proxy uses GraphQL:

```typescript
export async function sendMessage(message: string) {
  return fetch('/apps/shopify-chat/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation SendMessage($message: String!) {
          sendMessage(message: $message) {
            id
            text
            timestamp
          }
        }
      `,
      variables: { message },
    }),
    credentials: 'include',
  });
}
```

### Option C: Proxy is Just HTML/Widget Loader

If the proxy just serves the widget HTML:

- We'll need to intercept widget's internal API calls
- Use browser DevTools to find widget's internal endpoints
- Reverse-engineer the widget's communication protocol

## Next Steps

1. **Test the proxy endpoint** using the explorer tools
2. **Inspect network requests** on live site when using chat widget
3. **Document discovered API structure**
4. **Build custom UI component** based on findings
5. **Replace or enhance** existing ShopifyInbox component

## Testing Commands

```bash
# Test proxy exploration API
curl http://localhost:3000/api/chat/explore-proxy

# Test direct proxy endpoint (from browser console)
fetch('/apps/shopify-chat')
  .then(r => r.text())
  .then(console.log)

# Test with different methods
fetch('/apps/shopify-chat', { method: 'POST', body: JSON.stringify({}) })
  .then(r => r.json())
  .then(console.log)
```

## Expected Outcomes

**Best Case:**
- Proxy exposes clean REST/GraphQL API
- We can build custom UI easily
- Full control over design and UX

**Medium Case:**
- Proxy has some endpoints but limited
- We can send/receive messages
- May need to keep some widget functionality

**Worst Case:**
- Proxy is just HTML/widget loader
- Need to reverse-engineer widget's internal API
- More complex but still possible

## Files Created

1. `lib/chat/shopify-chat-proxy.ts` - Proxy API client
2. `app/api/chat/explore-proxy/route.ts` - Exploration API route
3. `components/chat/ProxyExplorer.tsx` - Dev exploration component
4. `PROXY-BASED-CUSTOM-CHAT.md` - This document

## Files to Create (After Discovery)

1. `components/chat/CustomChatWidget.tsx` - Custom UI component
2. `lib/chat/shopify-chat-api.ts` - API client based on discovered structure
3. `types/chat.ts` - TypeScript types for chat messages
4. `app/api/chat/send/route.ts` - Server-side send endpoint (if needed)
5. `app/api/chat/messages/route.ts` - Server-side messages endpoint (if needed)
