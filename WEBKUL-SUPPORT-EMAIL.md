# Email to Webkul Support

## Subject Line

Urgent: Need to Include Shipping Costs in Product Prices - Multi-vendor Marketplace Setup

---

## Email Body

```
To: support@webkul.com
CC: [your email]
Subject: Urgent: Need to Include Shipping Costs in Product Prices - Multi-vendor Marketplace Setup

Hi Webkul Support Team,

I'm currently using the Webkul Multi-vendor Marketplace app for Shopify and need assistance with a pricing configuration.

CURRENT SITUATION:
- We have 156 vendors with different shipping rates per vendor
- We're migrating to a headless storefront (custom frontend)
- We want to offer "Free Shipping" to customers
- To do this, we need to include each vendor's shipping cost in their product prices

WHAT WE NEED:
We need product prices in Shopify to be: Base Price + Shipping Cost

For example:
- Current price: $79.95
- Vendor shipping: $12.00
- New price: $91.95 (includes shipping)
- Display to customer: $91.95 with "FREE SHIPPING"

THE PROBLEM:
When we manually update product prices in Shopify to include shipping costs, your marketplace app appears to sync prices back to the original base price, removing our shipping additions.

QUESTIONS:

1. Does your marketplace app have a built-in feature to automatically add shipping costs to product prices?
   - Can we configure shipping rates per vendor?
   - Can the app add these rates to product prices automatically?

2. Can we configure your app to NOT sync/overwrite product prices from your system?
   - We need prices in Shopify to remain at "base + shipping"
   - Vendors would still manage their base prices via your app
   - But the final Shopify price would include their shipping rate

3. If neither of the above is possible, can we use Shopify Draft Orders with custom prices?
   - Will your app properly process orders created via Draft Orders?
   - Will order splitting by vendor still work?
   - Will vendors receive the correct payout amounts?

4. Alternative: Does your Multi-vendor API (https://mvmapi.webkul.com) support creating orders with custom line item prices?
   - Can we create checkout/orders via API with custom pricing?
   - Would this bypass the price sync issue?

OUR SETUP:
- Store: [Your Shopify store URL]
- App Version: [Your Webkul app version]
- Products: 4,409 products
- Vendors: 156 vendors
- Shopify Plan: [Your plan - Basic/Shopify/Advanced/Plus]

URGENCY:
We're ready to launch our headless storefront but this pricing issue is blocking us. We need a solution that:
- Allows custom pricing (base + shipping) at checkout
- Doesn't conflict with your marketplace app's price management
- Ensures vendors receive correct payout amounts
- Maintains order splitting functionality

PREFERRED SOLUTION (in order):
1. Built-in feature in your app to add shipping to prices
2. Setting to disable price sync/override
3. Confirmation that Draft Orders work with your app
4. API solution for custom order creation

Could you please advise on the best approach? If you need any additional information about our setup, I'm happy to provide it.

Looking forward to your guidance.

Best regards,
[Your Name]
[Your Store Name]
[Your Email]
[Your Phone - optional]

---

P.S. We're considering enabling your Multi-vendor API feature ($15/month) if it solves this issue, but need confirmation it supports custom pricing before purchasing.
```

---

## Alternative: Shorter Version

```
To: support@webkul.com
Subject: How to Add Shipping Costs to Product Prices?

Hi Webkul Support,

Quick question about pricing configuration:

We want to add each vendor's shipping cost to their product prices in Shopify (to offer "free shipping" to customers).

For example:
- Product base price: $79.95
- Vendor shipping: $12.00  
- Final Shopify price: $91.95

ISSUE: When we update prices in Shopify manually, your app syncs them back to the base price.

QUESTIONS:
1. Does your app have a setting to add shipping costs to product prices automatically?
2. Can we disable price sync to keep our custom prices?
3. Do Draft Orders work with your marketplace app for order splitting/vendor payouts?
4. Does your API support creating orders with custom prices?

Our setup:
- 4,409 products
- 156 vendors with different shipping rates
- Migrating to headless storefront

Please advise the best approach. Happy to provide more details if needed.

Thanks!
[Your Name]
[Your Email]
```

---

## Follow-up Questions (If They Respond)

If they say **"No built-in feature"**, ask:

```
Thanks for confirming. Follow-up questions:

1. Can we use metafields to prevent your app from overwriting prices?
2. If we add a metafield like "custom.includes_shipping = true", will your app respect it?
3. Can you add a feature request for per-vendor shipping cost configuration?
4. What's your recommendation for our use case?
```

If they say **"Use Draft Orders"**, ask:

```
Great! Can you confirm:

1. Draft Orders will be processed by your marketplace app correctly?
2. Order splitting by vendor will work?
3. Vendors will see these orders in their dashboard?
4. Vendor payouts will be calculated correctly?
5. Are there any limitations we should know about?
```

If they say **"Use our API"**, ask:

```
Perfect! Can you confirm:

1. The API supports creating orders with custom line item prices?
2. Which endpoint do we use? (POST /api/orders?)
3. What parameters are required for custom pricing?
4. Can you provide a sample API request?
5. Will this work with our current marketplace setup?
```

---

## Tips for Email

1. **Be specific** - Include your exact use case
2. **Show urgency** - But be polite
3. **Ask clear questions** - Numbered list
4. **Mention revenue** - "Blocking our launch" shows it's important
5. **Be willing to pay** - Mention API fee consideration
6. **Request documentation** - Ask for relevant docs/guides

## Expected Response Time

- Webkul typically responds within 24-48 hours
- For urgent issues, follow up after 48 hours
- Reference ticket: http://webkul.uvdesk.com/

## After You Get Response

Share their answer with me and I'll:
1. Analyze their proposed solution
2. Build the implementation
3. Help you test it
4. Deploy to production

---

**Good luck!** Let me know what they say! 🚀
