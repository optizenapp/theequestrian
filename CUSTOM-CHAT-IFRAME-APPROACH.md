# Custom Chat UI: Iframe Approach (Like Checkout Extensions)

## Understanding the Pattern

Based on the [Shopify Chat component documentation](https://shopify.dev/docs/api/checkout-ui-extensions/2024-10/components/overlays/chat), Shopify uses an **iframe-based pattern** for chat:

1. **Host Application**: Your custom chat UI hosted on your domain
2. **Iframe Embedding**: Shopify embeds your chat app in an iframe
3. **Communication**: Uses `postMessage` API for secure communication
4. **Backend**: Connects to Shopify Inbox backend via proxy

## Key Insight

The `/apps/shopify-chat` proxy endpoint on your storefront (`https://www.theequestrian.com.au/apps/shopify-chat`) likely serves a similar purpose - it's probably the **hosted chat application** that Shopify Inbox uses.

## Two Approaches

### Approach 1: Host Our Own Chat Application (Recommended)

**How it works:**
1. Build a custom chat UI React app
2. Host it on your domain (e.g., `https://www.theequestrian.com.au/chat-app`)
3. Embed it in an iframe on your storefront
4. Connect to Shopify Inbox backend via the proxy endpoint

**Benefits:**
- Full control over UI/UX
- Matches your brand perfectly
- Can use same backend connection as Shopify Inbox
- No monthly fees

**Implementation:**

```typescript
// components/chat/CustomChatIframe.tsx
'use client';

export function CustomChatIframe() {
  const chatAppUrl = process.env.NEXT_PUBLIC_CHAT_APP_URL || 
    'https://www.theequestrian.com.au/chat-app';

  return (
    <iframe
      src={chatAppUrl}
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        width: '415px',
        height: '700px',
        border: 'none',
        zIndex: 9999,
      }}
      allow="microphone; camera"
    />
  );
}
```

**Chat App Structure:**
```
/app/chat-app/
  ├── page.tsx          # Main chat UI
  ├── layout.tsx        # Chat app layout
  ├── components/
  │   ├── ChatWindow.tsx
  │   ├── MessageList.tsx
  │   ├── MessageInput.tsx
  │   └── ChatButton.tsx
  └── lib/
      └── shopify-chat-api.ts  # Connect to /apps/shopify-chat proxy
```

### Approach 2: Intercept and Enhance Existing Widget

**How it works:**
1. Keep Shopify Inbox widget
2. Use CSS to heavily style it
3. Use JavaScript to intercept and modify messages
4. Override greeting message via DOM manipulation

**Limitations:**
- Less control
- Fragile (breaks if Shopify updates widget)
- Still shows some Shopify branding

## Recommended: Approach 1 - Custom Chat App

### Step 1: Create Chat Application Route

**File: `app/chat-app/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { ChatButton } from './components/ChatButton';

export default function ChatApp() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);

  // Listen for messages from parent window (if embedded)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from parent (storefront)
      if (event.data.type === 'OPEN_CHAT') {
        setIsOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send messages to parent window
  const sendToParent = (data: any) => {
    if (window.parent !== window) {
      window.parent.postMessage(data, '*');
    }
  };

  return (
    <div className="chat-app">
      {!isOpen ? (
        <ChatButton onClick={() => setIsOpen(true)} />
      ) : (
        <ChatWindow
          messages={messages}
          onSend={(message) => {
            // Send via proxy API
            sendMessageViaProxy(message);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

### Step 2: Connect to Proxy Endpoint

**File: `app/chat-app/lib/shopify-chat-api.ts`**

```typescript
/**
 * API client for Shopify Chat proxy endpoint
 * 
 * The proxy endpoint: /apps/shopify-chat
 * This connects to Shopify Inbox backend
 */

const PROXY_BASE = '/apps/shopify-chat';

export async function sendMessage(message: string, conversationId?: string) {
  const response = await fetch(`${PROXY_BASE}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important: include cookies for auth
    body: JSON.stringify({
      message,
      conversationId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}

export async function getMessages(conversationId?: string) {
  const response = await fetch(
    `${PROXY_BASE}/messages${conversationId ? `?conversation=${conversationId}` : ''}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get messages: ${response.statusText}`);
  }

  return response.json();
}

export async function getChatConfig() {
  const response = await fetch(`${PROXY_BASE}/config`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to get config: ${response.statusText}`);
  }

  return response.json();
}
```

### Step 3: Create Chat UI Components

**File: `app/chat-app/components/ChatWindow.tsx`**

```typescript
'use client';

interface ChatWindowProps {
  messages: Message[];
  onSend: (message: string) => void;
  onClose: () => void;
}

export function ChatWindow({ messages, onSend, onClose }: ChatWindowProps) {
  const [input, setInput] = useState('');

  return (
    <div className="fixed bottom-0 right-0 w-[415px] h-[700px] bg-white shadow-2xl rounded-t-lg flex flex-col">
      {/* Header */}
      <div className="bg-[#BD7AB3] text-white p-4 rounded-t-lg flex justify-between items-center">
        <h2 className="font-semibold">Chat with us</h2>
        <button onClick={onClose} className="text-white hover:opacity-80">
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Greeting Message */}
        <div className="text-gray-600 text-sm">
          👋 Hey. Welcome to The Equestrian. If you have a question, just ask. We'll reply shortly.
        </div>

        {/* Message List */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.sender === 'user'
                  ? 'bg-[#BD7AB3] text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              onSend(input);
              setInput('');
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <button
            type="submit"
            className="bg-[#BD7AB3] text-white px-6 py-2 rounded-lg hover:bg-[#a5699f]"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Step 4: Embed in Storefront

**File: `components/chat/CustomChatWidget.tsx`**

```typescript
'use client';

import { useState } from 'react';

export function CustomChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const chatAppUrl = process.env.NEXT_PUBLIC_CHAT_APP_URL || 
    '/chat-app';

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-[#BD7AB3] text-white rounded-full w-14 h-14 shadow-lg hover:bg-[#a5699f] transition-colors z-50 flex items-center justify-center"
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat Iframe */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50">
          <iframe
            src={chatAppUrl}
            className="w-[415px] h-[700px] border-0 rounded-t-lg shadow-2xl"
            allow="microphone; camera"
            title="Chat with us"
          />
        </div>
      )}
    </>
  );
}
```

## Testing the Proxy Endpoint

Before building, we need to understand what `/apps/shopify-chat` actually returns:

```bash
# Test from browser console on live site
fetch('/apps/shopify-chat')
  .then(r => r.text())
  .then(console.log)

# Or test from your local dev server
fetch('https://www.theequestrian.com.au/apps/shopify-chat', {
  credentials: 'include',
})
  .then(r => r.text())
  .then(console.log)
```

## Next Steps

1. **Test the proxy endpoint** - See what it actually returns
2. **Inspect network requests** - See what API calls the widget makes
3. **Build chat app route** - Create `/chat-app` page
4. **Create API client** - Connect to proxy based on discovered structure
5. **Build UI components** - Custom chat interface
6. **Embed in storefront** - Replace/enhance ShopifyInbox component

## Files to Create

1. `app/chat-app/page.tsx` - Main chat application
2. `app/chat-app/components/ChatWindow.tsx` - Chat UI
3. `app/chat-app/components/ChatButton.tsx` - Minimized button
4. `app/chat-app/lib/shopify-chat-api.ts` - Proxy API client
5. `components/chat/CustomChatWidget.tsx` - Iframe wrapper for storefront
6. `types/chat.ts` - TypeScript types

## Advantages of This Approach

✅ Full UI control  
✅ Matches your brand  
✅ Uses Shopify Inbox backend (via proxy)  
✅ No monthly fees  
✅ Can be enhanced with features (typing indicators, read receipts, etc.)  
✅ Works on all pages (not just checkout)  

## Questions to Answer

1. What does `/apps/shopify-chat` return? (HTML, JSON, redirect?)
2. What API endpoints does it expose? (`/send`, `/messages`, etc.)
3. How does authentication work? (cookies, tokens?)
4. What's the message format? (JSON structure?)

Once we test the proxy, we can build the exact implementation!
