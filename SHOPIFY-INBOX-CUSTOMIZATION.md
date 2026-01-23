# Shopify Inbox Widget Customization

## Overview

The `CustomizedShopifyInbox` component loads the Shopify Inbox widget but overrides the styling and messaging using CSS and JavaScript.

**Key Point:** The backend functionality remains unchanged - all messages still go to Shopify Inbox.

## What Gets Customized

✅ **Colors:**
- Button background
- Header background  
- Text colors
- Send button colors
- Message bubble colors

✅ **Greeting Message:**
- Overrides the default greeting
- Uses your custom message

✅ **Position:**
- Left/right placement
- Top/bottom placement

❌ **Backend:**
- Still uses Shopify Inbox
- Messages go to Shopify admin
- Staff responds via Shopify Inbox

## Implementation

### File: `components/chat/CustomizedShopifyInbox.tsx`

This component:
1. Loads the Shopify Inbox widget script
2. Injects custom CSS to override colors
3. Uses JavaScript to replace the greeting message
4. Applies your brand colors

### Usage

In `app/layout.tsx`:

```typescript
import { CustomizedShopifyInbox } from '@/components/chat/CustomizedShopifyInbox';

<CustomizedShopifyInbox
  colors={{
    background: '#BD7AB3', // Mauve
    text: '#FFFFFF',
    buttons: '#5DBEBD', // Teal
  }}
  greetingMessage="👋 Hey. Welcome to The Equestrian. If you have a question, just ask. We'll reply shortly."
  position={{
    horizontal: 'right',
    vertical: 'bottom',
  }}
/>
```

## How It Works

### 1. CSS Overrides

Injects custom CSS that targets the widget's elements:

```css
#shopify-chat button {
  background-color: #BD7AB3 !important;
  color: #FFFFFF !important;
}
```

### 2. Greeting Message Override

Uses JavaScript to find and replace the greeting text:

```javascript
const greetingElement = document.querySelector('[data-greeting]');
if (greetingElement) {
  greetingElement.textContent = 'Your custom message';
}
```

### 3. MutationObserver

Watches for DOM changes to ensure customizations persist even if the widget re-renders.

## Customization Options

```typescript
interface CustomizationConfig {
  colors?: {
    background?: string;  // Button & header background
    text?: string;        // Text color
    buttons?: string;     // Send button color
  };
  greetingMessage?: string;  // Custom greeting
  position?: {
    horizontal?: 'left' | 'right';
    vertical?: 'bottom' | 'top';
  };
}
```

## Benefits

✅ Keep Shopify Inbox backend (free)  
✅ Match your brand colors  
✅ Custom greeting message  
✅ No monthly fees  
✅ Staff uses Shopify Inbox admin  
✅ Simple implementation  

## Limitations

⚠️ CSS overrides can break if Shopify changes widget structure  
⚠️ Greeting override is "hacky" (DOM manipulation)  
⚠️ Limited to visual customization only  
⚠️ Cannot change core functionality  

## Testing

1. Start dev server: `npm run dev`
2. Open your site
3. Check if widget loads with custom colors
4. Open chat and verify greeting message
5. Send a test message to verify backend still works

## Fallback

If customizations don't apply (Shopify changes widget structure):

1. Check browser console for errors
2. Inspect widget DOM to find correct selectors
3. Update CSS selectors in component
4. Or revert to standard `ShopifyInbox` component

## Alternative Approach

If you need more control, consider:
- **Crisp** ($25/month) - Full API, custom UI
- **Intercom** ($74/month) - More features
- **Custom system** - Build from scratch

But for now, this gives you brand customization while keeping Shopify Inbox's functionality.
