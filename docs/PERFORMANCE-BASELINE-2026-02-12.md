# Storefront Performance Baseline (2026-02-12)

Environment:
- Local development server (`next dev`) on `http://127.0.0.1:3003`
- Measurements captured before optimization changes were applied in this session
- Values below are full response timings in milliseconds from a simple Node fetch script

## Baseline Timings

### First Pass (cold-ish)
- `/`: `2346.3ms`
- `/search?q=saddle`: `2161.8ms`
- `/cart`: `3195.3ms`
- `/clothing`: `2945.5ms`
- `/on-sale`: `5018.5ms`

### Second Pass (warm-ish)
- `/`: `1371.3ms`
- `/search?q=saddle`: `3043.7ms`
- `/cart`: `1843.8ms`
- `/clothing`: `1630.8ms`
- `/on-sale`: `2355.4ms`

## Observed Request Hotspots (from dev logs)
- `/api/mapping/subcategories-with-images` frequently returns in `~0.7s` to `~2.3s`.
- Collection/category processing paths perform heavy product-type fan-out and facet computation.
- Multiple product-type fetches are triggered across category exploration and mega menu flows.

## Notes
- Dev-mode numbers are directionally useful, but production validation should use Vercel deployment plus Lighthouse/Web Vitals.
- This baseline is intended for before/after comparison after the optimization rollout.
