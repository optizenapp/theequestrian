# Storefront Performance Delta (2026-02-12)

This compares local dev timings captured before and after the performance implementation.

Environment:
- Local `next dev` server on `http://127.0.0.1:3003`
- Same quick timing script used for both passes

## Before vs After (Second Pass / warm-ish)

| Route | Before | After | Delta |
| --- | ---: | ---: | ---: |
| `/` | 1371.3ms | 1374.8ms | +3.5ms |
| `/search?q=saddle` | 3043.7ms | 3440.0ms | +396.3ms |
| `/cart` | 1843.8ms | 1431.8ms | -412.0ms |
| `/clothing` | 1630.8ms | 1371.7ms | -259.1ms |
| `/on-sale` | 2355.4ms | 1871.7ms | -483.7ms |

## Notes
- Dev timings are noisy and include HMR/dev overhead.
- The biggest wins in this pass are on collection/cart pathways.
- Search timing did not improve in dev-mode; this should be re-tested on a production build because local DB/network variance can dominate.
- The key structural wins in this rollout are reduced Shopify fan-out and fewer client-side review/status fetches, which should show more clearly in production telemetry.
