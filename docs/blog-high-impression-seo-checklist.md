# High-impression blog SEO checklist (manual)

Use this after shipping headless blog fixes. Edit each article in **your admin** (`/admin/articles`) or directly in Neon: content, meta title/description, tags, and headless fields ([shopify-blog-metafields.md](./shopify-blog-metafields.md) — Neon columns section).

## Priority handles (align with Search Console)

- Horse lifespan / age queries: set title + meta to answer directly; `headless_cta_path` → `/horse/veterinary` or `/horse/stable/feed` if supplement-focused.
- Rain scald, greasy heel: CTA path → `/horse/veterinary`; intro states AU context + when to call a vet.
- Bran for horses, MSM / methylsulfonylmethane: CTA path → `/horse/stable/feed`.
- Saddle measurement, bridle sizing: CTA path → `/horse/saddles` or `/horse/tack/bridles` as appropriate.
- Dog hemp oil: CTA path → `/pet/dog`.
- Fly spray: CTA path → `/horse/grooming` (or a tighter collection once mapped).
- Worming, ulcer treatments: CTA path → `/horse/veterinary` or `/horse/stable/feed`.

## Per article

1. **Search engine listing:** Title ≤ ~60 chars with clear promise; meta description ≤ ~155 chars + soft CTA (“Shop … at The Equestrian”).
2. **Intro:** First 1–2 sentences match the query (numbers, yes/no, steps).
3. **Headless fields:** `headless_cta_path`, optional `headless_cta_label`, optional `headless_related_handles` for editorial picks.
4. **Body:** Remove leftover Liquid; use canonical internal links (rewriter helps, but source content should be clean).

Re-check **Google Search Console** CTR 4–8 weeks after updates.
