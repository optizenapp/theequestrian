# Custom Chat UI Integration Plan

## Overview

Create a custom chat UI component that matches your brand design, with options to connect to Shopify Inbox backend or alternative messaging services. Since Shopify Inbox doesn't expose a public API for custom UIs, we'll explore multiple integration approaches.

## Current Situation

- Shopify Inbox widget works but has limited customization
- No public API for custom chat UIs from Shopify
- Need full control over UI/UX and messaging
- Want to use Shopify Inbox backend if possible

## Integration Options

### Option 1: Custom UI + Third-Party Service (Recommended)

**Services:**
- **Crisp** ($25/month) - Best value, good API, Shopify integration
- **Intercom** ($74+/month) - More features, better known
- **Zendesk Chat** ($55/month) - Enterprise-focused

**Pros:**
- Full UI control
- Public APIs available
- Shopify integration possible
- Better features (typing indicators, read receipts)
- Real-time messaging built-in

**Cons:**
- Additional monthly cost
- Need to set up integration
- Messages go to third-party, not directly to Shopify Inbox

**Implementation:** 10-15 hours

### Option 2: Custom UI + Custom Backend

**Approach:** Build custom UI, store messages in Postgres, sync with Shopify

**Pros:**
- Full control
- No monthly fees
- Can sync with Shopify Inbox via webhooks
- Complete customization

**Cons:**
- More complex (20-30 hours)
- Need WebSocket service (Pusher/Ably) for real-time
- Need to build admin interface
- Need to handle message delivery

**Implementation:** 20-30 hours

### Option 3: Enhanced Shopify Inbox Widget

**Approach:** Keep Shopify Inbox widget, style it heavily with CSS/JS

**Pros:**
- Easiest (2-3 hours)
- Uses existing Shopify Inbox
- No API needed
- Free

**Cons:**
- Limited customization
- Still shows Shopify branding
- Can't change message flow
- Fragile (breaks if Shopify updates widget)

**Implementation:** 2-3 hours

## Recommended: Option 1 (Crisp)

**Why Crisp:**
- Best value ($25/month)
- Excellent API documentation
- Shopify integration available
- Real-time messaging
- Mobile apps for staff
- Easy to customize

## Implementation Plan

### Phase 1: Custom Chat UI Component

Create beautiful, brand-matched chat widget:

**File: `components/chat/CustomChatWidget.tsx`**

Features:
- Custom greeting message (configurable)
- Message history with timestamps
- Input field with send button
- Typing indicators
- Online/offline status
- Smooth animations
- Mobile-responsive
- Brand colors (Mauve #BD7AB3, Teal #5DBEBD)

### Phase 2: Crisp Integration

**Setup:**
1. Sign up for Crisp account
2. Get API credentials
3. Install Crisp React SDK
4. Configure Shopify integration in Crisp dashboard

**Files to Create:**
- `lib/chat/crisp-client.ts` - Crisp SDK wrapper
- `components/chat/CustomChatWidget.tsx` - UI component
- `app/api/chat/config/route.ts` - Get Crisp config

### Phase 3: Customization

- Match brand colors
- Custom greeting message
- Product link sharing
- Order tracking integration
- File upload support

## Files to Create

1. `components/chat/CustomChatWidget.tsx` - Main chat UI
2. `components/chat/ChatMessage.tsx` - Message bubble component
3. `components/chat/ChatInput.tsx` - Input component
4. `lib/chat/crisp-client.ts` - Crisp integration
5. `types/chat.ts` - TypeScript types

## Files to Modify

1. `app/layout.tsx` - Replace/enhance ShopifyInbox with CustomChatWidget
2. `lib/env.ts` - Add Crisp environment variables

## Environment Variables

```bash
# Crisp Configuration
NEXT_PUBLIC_CRISP_WEBSITE_ID=your-crisp-website-id
CRISP_API_IDENTIFIER=your-api-identifier
CRISP_API_KEY=your-api-key
```

## Design Specifications

### Chat Widget

- **Button:** Floating action button, bottom-right, Mauve color
- **Widget:** White background, rounded corners, shadow
- **Header:** "Chat with us" with close button
- **Greeting:** Custom message with emoji
- **Messages:** User (right, Mauve), Staff (left, Gray)
- **Input:** Rounded with send button

### Greeting Message

Configurable, default:
"👋 Hey. Welcome to The Equestrian. If you have a question, just ask. We'll reply shortly."

## Next Steps

**Please choose:**
1. **Custom UI + Crisp** (Recommended, $25/month, 10-15 hours)
2. **Custom UI + Custom Backend** (Free, 20-30 hours, more complex)
3. **Enhanced Shopify Widget** (Free, 2-3 hours, limited)

Once you decide, I'll implement the chosen approach.
