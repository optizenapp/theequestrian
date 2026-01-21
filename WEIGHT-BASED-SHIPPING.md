# Weight-Based Shipping Support ✅

Your shipping system now supports **weight-based shipping rates** for vendors like CAN Animal Care!

## How It Works

### Priority Order:
1. **Weight-based rules** (if vendor is configured & weight available)
2. **Tag overrides** (heavy, bulky, etc.)
3. **Vendor flat rates**
4. **Default rate**

### Configuration

Edit `lib/shipping/rates.ts`:

```typescript
export const WEIGHT_BASED_VENDORS: Record<string, Array<{ maxWeight: number; cost: number }>> = {
  'CAN Animal Care': [
    { maxWeight: 5, cost: 5.00 },    // 0-5kg = $5
    { maxWeight: 10, cost: 10.00 },  // 5.01-10kg = $10
    { maxWeight: 20, cost: 15.00 },  // 10.01-20kg = $15
    { maxWeight: Infinity, cost: 20.00 }, // 20kg+ = $20
  ],
  // Add more weight-based vendors here
};
```

## Example: CAN Animal Care

| Product Weight | Shipping Cost |
|---------------|---------------|
| 0.0 - 5.0 kg  | $5.00         |
| 5.1 - 10.0 kg | $10.00        |
| 10.1 - 20.0 kg| $15.00        |
| 20.0+ kg      | $20.00        |

## How It Calculates

```typescript
// Product: Dog Food 8kg from CAN Animal Care
getShippingCost('CAN Animal Care', [], 8) 
// → Returns $10.00 (matches 5.1-10kg range)

// Product: Cat Food 3kg from CAN Animal Care
getShippingCost('CAN Animal Care', [], 3)
// → Returns $5.00 (matches 0-5kg range)

// Product: Large Dog Food 25kg from CAN Animal Care
getShippingCost('CAN Animal Care', [], 25)
// → Returns $20.00 (over 20kg)
```

## Data Flow

```
1. Customer adds product to cart
   → Shopify stores weight in grams

2. Customer clicks checkout
   → Cart includes: weight: 8000 (grams)

3. API converts to kg
   → weightInKg: 8 (kg)

4. Shipping calculator checks:
   → Is "CAN Animal Care" in WEIGHT_BASED_VENDORS? YES
   → Is weight 8kg ≤ 10kg? YES
   → Return $10.00

5. Draft order created:
   → Base price: $45.00
   → Shipping: $10.00
   → Total: $55.00
```

## What If Weight Is Missing?

If a product doesn't have weight data in Shopify:

```typescript
getShippingCost('CAN Animal Care', [], undefined)
// → Falls back to vendor flat rate or default
```

**Recommendation:** Ensure all weight-based vendor products have weight set in Shopify!

## Adding More Weight-Based Vendors

Just add to the config:

```typescript
export const WEIGHT_BASED_VENDORS: Record<string, Array<{ maxWeight: number; cost: number }>> = {
  'CAN Animal Care': [
    { maxWeight: 5, cost: 5.00 },
    { maxWeight: 10, cost: 10.00 },
    { maxWeight: 20, cost: 15.00 },
    { maxWeight: Infinity, cost: 20.00 },
  ],
  'Another Heavy Vendor': [
    { maxWeight: 10, cost: 12.00 },
    { maxWeight: 25, cost: 18.00 },
    { maxWeight: Infinity, cost: 25.00 },
  ],
};
```

## Testing Weight-Based Shipping

1. Find a CAN Animal Care product
2. Check its weight in Shopify (Product → Shipping → Weight)
3. Add to cart
4. Go to checkout
5. Check console logs:

```
[Shipping] CAN Animal Care: 8kg → $10.00 (weight-based)
[DraftOrder] Dog Food Premium (8kg): $45.00 + $10.00 = $55.00
```

## Important Notes

- **Weight must be in Shopify** - If product has no weight, falls back to flat rate
- **Vendor name must match exactly** - "CAN Animal Care" vs "Can Animal Care" matters!
- **Weight in grams** - Shopify stores weight in grams, we auto-convert to kg
- **Logs show calculation** - Console will show which rule matched

## Fallback Behavior

```typescript
// Scenario 1: Weight available + weight-based vendor
getShippingCost('CAN Animal Care', [], 8)
→ $10.00 (weight rule)

// Scenario 2: No weight + weight-based vendor
getShippingCost('CAN Animal Care', [])
→ $15.00 (vendor flat rate or default)

// Scenario 3: Weight + has "heavy" tag
getShippingCost('CAN Animal Care', ['heavy'], 8)
→ $35.00 (tag override beats weight!)
```

## Summary

✅ **Weight-based shipping works!**  
✅ **Automatic kg conversion**  
✅ **Smart fallbacks**  
✅ **Easy to configure**  
✅ **Console logging for debugging**  

Just configure `WEIGHT_BASED_VENDORS` and you're done! 🎉
